import { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, doc, onSnapshot } from 'firebase/firestore';

export default function RestaurantPlanner() {
  const [mode, setMode] = useState('create'); // 'create', 'input', 'results'
  const [sessionId, setSessionId] = useState(null);
  const [session, setSession] = useState(null);

  // Creator (initiator) fields
  const [initiatorName, setInitiatorName] = useState('');
  const [city, setCity] = useState('Bangalore');
  const [numFriends, setNumFriends] = useState(3);
  const [meetupDate, setMeetupDate] = useState('');
  const [meetupTime, setMeetupTime] = useState('20:00');

  // Friend input fields
  const [friendName, setFriendName] = useState('');
  const [location, setLocation] = useState('');
  const [isVeg, setIsVeg] = useState(false);
  const [noAlcohol, setNoAlcohol] = useState(false);
  const [budget, setBudget] = useState('1000-1500');
  const [arrivalTime, setArrivalTime] = useState('19:30');
  const [nearMetro, setNearMetro] = useState(false);
  const [otherPrefs, setOtherPrefs] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [recommendations, setRecommendations] = useState(null);
  
  // RSVP state
  const [rsvpStatus, setRsvpStatus] = useState(null); // null, 'yes', 'no'
  const [hasRsvped, setHasRsvped] = useState(false);

  // Load session from URL if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlSessionId = params.get('session');

    if (urlSessionId) {
      setSessionId(urlSessionId);
      setMode('input');
      
      // Try to restore user identity from localStorage
      const storedName = localStorage.getItem(`restaurant_user_${urlSessionId}`);
      if (storedName) {
        setFriendName(storedName);
      }
      
      // Set up real-time listener
      const sessionRef = doc(db, 'restaurant-sessions', urlSessionId);
      const unsubscribe = onSnapshot(sessionRef, (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setSession(data);
          
          // Restore RSVP status if user already RSVP'd
          if (storedName && data.rsvps) {
            const userRsvp = data.rsvps.find(r => r.name.toLowerCase() === storedName.toLowerCase());
            if (userRsvp) {
              setHasRsvped(true);
              setRsvpStatus(userRsvp.status);
            }
          }
          
          // If recommendations exist, show results
          if (data.synthesis) {
            setRecommendations(data.synthesis);
            setMode('results');
          }
        }
      });

      return () => unsubscribe();
    }
  }, []);

  const submitRsvp = async (status) => {
    if (!friendName.trim()) {
      alert('Please enter your name first');
      return;
    }

    try {
      const sessionRef = doc(db, 'restaurant-sessions', sessionId);
      const sessionSnap = await (await import('firebase/firestore')).getDoc(sessionRef);
      const currentRsvps = sessionSnap.data()?.rsvps || [];

      // Check if this person already RSVP'd
      const existingRsvp = currentRsvps.find(r => r.name.toLowerCase() === friendName.toLowerCase());
      if (existingRsvp) {
        alert(`You've already RSVP'd as "${existingRsvp.status === 'yes' ? 'attending' : 'not attending'}"`);
        setHasRsvped(true);
        setRsvpStatus(existingRsvp.status);
        return;
      }

      const rsvpData = {
        name: friendName,
        status: status, // 'yes' or 'no'
        timestamp: new Date().toISOString()
      };

      await (await import('firebase/firestore')).updateDoc(sessionRef, {
        rsvps: [...currentRsvps, rsvpData]
      });

      setRsvpStatus(status);
      setHasRsvped(true);
      
      // Save identity to localStorage
      localStorage.setItem(`restaurant_user_${sessionId}`, friendName);
      
    } catch (error) {
      console.error('Error submitting RSVP:', error);
      alert('Failed to submit RSVP. Please try again.');
    }
  };

  const createSession = async () => {
    if (!initiatorName.trim()) {
      alert('Please enter your name');
      return;
    }

    if (!meetupDate || !meetupTime) {
      alert('Please select a date and time for the meetup');
      return;
    }

    try {
      const sessionData = {
        type: 'restaurant',
        city: city,
        initiatorName: initiatorName, // Use actual host name!
        numFriends: numFriends,
        meetupDate: meetupDate,
        meetupTime: meetupTime,
        createdAt: new Date().toISOString(),
        submissions: [],
        rsvps: [{
          name: initiatorName,
          status: 'yes',
          timestamp: new Date().toISOString()
        }], // Host is auto-RSVP'd
        synthesis: ''
      };

      const docRef = await addDoc(collection(db, 'restaurant-sessions'), sessionData);
      const newSessionId = docRef.id;
      setSessionId(newSessionId);
      setSession(sessionData);

      // Set host identity BEFORE switching to input mode
      setFriendName(initiatorName);
      setHasRsvped(true);
      setRsvpStatus('yes');
      
      // Save to localStorage
      localStorage.setItem(`restaurant_user_${newSessionId}`, initiatorName);

      const baseUrl = window.location.origin;
      const link = `${baseUrl}/restaurant?session=${newSessionId}`;
      setInviteLink(link);
      
      setMode('input');
      window.history.pushState({}, '', `/restaurant?session=${newSessionId}`);
    } catch (error) {
      console.error('Error creating session:', error);
      alert('Failed to create session. Please try again.');
    }
  };

  const submitInput = async () => {
    if (!friendName.trim() || !location.trim()) {
      alert('Please enter your name and location');
      return;
    }

    setIsSubmitting(true);

    try {
      const sessionRef = doc(db, 'restaurant-sessions', sessionId);
      const sessionSnap = await (await import('firebase/firestore')).getDoc(sessionRef);
      const sessionData = sessionSnap.data();
      const currentSubmissions = sessionData?.submissions || [];
      const currentRsvps = sessionData?.rsvps || [];
      
      // Check if this is the HOST (first submission, no initiatorName set yet)
      const isHost = !sessionData.initiatorName || sessionData.initiatorName === '';
      
      // Format the input as analysis text
      const analysisText = `
Location: ${location}
Dietary: ${isVeg ? 'Vegetarian only' : 'Non-veg okay'}
Alcohol: ${noAlcohol ? 'No alcohol' : 'Alcohol okay'}
Budget: ₹${budget} per person
Arrival time: ${arrivalTime}
${nearMetro ? 'Prefer: Near Metro station' : ''}
${otherPrefs ? `Other: ${otherPrefs}` : ''}
      `.trim();

      const submission = {
        collaboratorName: friendName,
        role: isHost ? 'Host' : 'Friend',
        analysis: analysisText,
        customPrompt: '',
        submittedAt: new Date().toISOString()
      };

      // Prepare update object
      const updateData = {
        submissions: [...currentSubmissions, submission]
      };
      
      // If this is the host, set initiatorName and auto-RSVP
      if (isHost) {
        updateData.initiatorName = friendName;
        updateData.rsvps = [{
          name: friendName,
          status: 'yes',
          timestamp: new Date().toISOString()
        }];
        
        // Mark as host in local state
        setHasRsvped(true);
        setRsvpStatus('yes');
        
        // Save to localStorage
        localStorage.setItem(`restaurant_user_${sessionId}`, friendName);
      }

      await (await import('firebase/firestore')).updateDoc(sessionRef, updateData);

      alert('Your preferences submitted! Share the link with other friends.');
      
      // Don't reset friendName - keep user identity!
      // Reset only form fields
      setLocation('');
      setIsVeg(false);
      setNoAlcohol(false);
      setBudget('1000-1500');
      setArrivalTime('19:30');
      setNearMetro(false);
      setOtherPrefs('');
      
    } catch (error) {
      console.error('Error submitting:', error);
      alert('Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateRecommendations = async () => {
    if (!session?.submissions || session.submissions.length === 0) {
      alert('Waiting for friends to submit their preferences...');
      return;
    }

    setIsGenerating(true);

    try {
      // Format all submissions for the prompt
      const friendsInputs = session.submissions.map(sub => 
        `${sub.collaboratorName}:\n${sub.analysis}`
      ).join('\n\n');

      const confirmedCount = session.rsvps?.filter(r => r.status === 'yes').length || session.submissions.length;
      const declinedCount = session.rsvps?.filter(r => r.status === 'no').length || 0;

      // Handle missing date/time for backward compatibility
      let meetupDateStr = 'Soon';
      if (session.meetupDate) {
        try {
          meetupDateStr = new Date(session.meetupDate).toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric', 
            year: 'numeric' 
          });
        } catch (e) {
          meetupDateStr = session.meetupDate;
        }
      }

      const meetupTimeStr = session.meetupTime || '8:00 PM';

      const prompt = `You are helping a group of friends in ${session.city}, India find the perfect restaurant to meet for dinner.

MEETING DETAILS:
📅 Date: ${meetupDateStr}
🕐 Time: ${meetupTimeStr}
📍 City: ${session.city}
👥 Confirmed Attendees: ${confirmedCount}
${declinedCount > 0 ? `❌ Unable to Attend: ${declinedCount}` : ''}

FRIENDS' PREFERENCES:
${friendsInputs}

TASK: Recommend 2-3 restaurants in ${session.city} that work for EVERYONE. Consider:
1. Geographic convenience (minimize total travel time for all)
2. Satisfy ALL dietary requirements (if anyone is veg-only, must have excellent veg options)
3. Fit within everyone's budget constraints
4. Match alcohol preferences (if anyone prefers no alcohol, choose places with good non-alcoholic options)
5. Consider metro accessibility if mentioned
6. Good ratings and ambiance for groups

OUTPUT FORMAT (IMPORTANT - Use this exact structure):
For each restaurant, provide:

🍽️ [RESTAURANT NAME], [AREA]
⭐ [One-line why it's perfect for this group]

📍 Distances:
• [Friend 1 name]: [Distance] km ([Time] min)
• [Friend 2 name]: [Distance] km ([Time] min)
• [Friend 3 name]: [Distance] km ([Time] min)

✅ Why it works:
• [Dietary fit]
• [Alcohol/beverage options]
• [Budget fit - ₹X per person average]
• [Group-friendly features]
• [Metro access if relevant]

🗺️ Location: [Detailed area/landmark]
⏰ Best time: [Based on arrival times]

---

Provide 2-3 options, with the BEST option first.`;

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/claude`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          maxTokens: 3000
        }),
      });

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }

      const data = await response.json();
      
      console.log('Backend response:', data); // DEBUG: See what we got

      // Handle different response formats
      let recommendationText;
      
      if (data.content && data.content[0]?.text) {
        // Claude API direct format
        recommendationText = data.content[0].text;
      } else if (data.response) {
        // Wrapped format
        recommendationText = data.response;
      } else if (data.text) {
        // Simple text format
        recommendationText = data.text;
      } else if (typeof data === 'string') {
        // Direct string
        recommendationText = data;
      } else {
        console.error('Unexpected response format:', data);
        throw new Error('Unexpected response format from backend');
      }

      if (recommendationText) {
        setRecommendations(recommendationText);
        
        // Save to Firebase
        const sessionRef = doc(db, 'restaurant-sessions', sessionId);
        await (await import('firebase/firestore')).updateDoc(sessionRef, {
          synthesis: recommendationText,
          synthesisGeneratedAt: new Date().toISOString()
        });
        
        setMode('results');
      } else {
        throw new Error('No recommendations received from AI');
      }
    } catch (error) {
      console.error('Error generating recommendations:', error);
      alert('Failed to generate recommendations. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    alert('Link copied! Share it with your friends on WhatsApp.');
  };

  const resetSession = () => {
    setMode('create');
    setSessionId(null);
    setSession(null);
    setInviteLink('');
    setRecommendations(null);
    window.history.pushState({}, '', '/restaurant');
  };

  // CREATE MODE - Initiator creates the plan
  if (mode === 'create') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              🍽️ Where Should We Meet?
            </h1>
            <p className="text-gray-600">
              Find the perfect restaurant for your group - no endless debates!
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  value={initiatorName}
                  onChange={(e) => setInitiatorName(e.target.value)}
                  placeholder="e.g., Venky"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Which City?
                </label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="Bangalore">Bangalore</option>
                  <option value="Mumbai">Mumbai</option>
                  <option value="Delhi NCR">Delhi NCR</option>
                  <option value="Chennai">Chennai</option>
                  <option value="Hyderabad">Hyderabad</option>
                  <option value="Pune">Pune</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  📅 When are you meeting?
                </label>
                <input
                  type="date"
                  value={meetupDate}
                  onChange={(e) => setMeetupDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  🕐 What time?
                </label>
                <input
                  type="time"
                  value={meetupTime}
                  onChange={(e) => setMeetupTime(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  How many friends (including you)?
                </label>
                <select
                  value={numFriends}
                  onChange={(e) => setNumFriends(parseInt(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map(num => (
                    <option key={num} value={num}>{num} friends</option>
                  ))}
                </select>
              </div>

              <button
                onClick={createSession}
                className="w-full py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg font-bold text-lg hover:from-orange-700 hover:to-red-700 transition-colors"
              >
                🚀 Start Planning
              </button>
            </div>
          </div>

          <div className="mt-6 text-center text-sm text-gray-600">
            <p>✨ Powered by AI • Share link with friends • Get instant recommendations</p>
          </div>
        </div>
      </div>
    );
  }

  // INPUT MODE - Friend submits preferences
  if (mode === 'input') {
    // RSVP SCREEN - Show only for friends (not for host who just created session)
    // Host is identified by empty initiatorName in session
    const isHostCreating = session && (!session.initiatorName || session.initiatorName === '');
    
    if (!hasRsvped && session && !isHostCreating) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-6">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                🍽️ {session.initiatorName}'s Dinner Plan
              </h1>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="text-center mb-8">
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  You're Invited!
                </h2>
                <div className="space-y-3 text-lg text-gray-700">
                  <p>
                    📅 <span className="font-semibold">
                      {new Date(session.meetupDate).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        month: 'long', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </span>
                  </p>
                  <p>
                    🕐 <span className="font-semibold">{session.meetupTime}</span>
                  </p>
                  <p>
                    📍 <span className="font-semibold">{session.city}</span>
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  value={friendName}
                  onChange={(e) => setFriendName(e.target.value)}
                  placeholder="e.g., Raj"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div className="border-t pt-6">
                <p className="text-center text-lg font-semibold text-gray-900 mb-6">
                  Will you join us?
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => submitRsvp('yes')}
                    className="py-4 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-700 transition-colors"
                  >
                    ✅ Yes, I'll be there!
                  </button>
                  <button
                    onClick={() => submitRsvp('no')}
                    className="py-4 bg-gray-400 text-white rounded-lg font-bold text-lg hover:bg-gray-500 transition-colors"
                  >
                    ❌ Can't make it
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 text-center text-sm text-gray-600">
              <p>✨ RSVP to help us plan better</p>
            </div>
          </div>
        </div>
      );
    }

    // "CAN'T MAKE IT" MESSAGE - Show if user declined
    if (hasRsvped && rsvpStatus === 'no') {
      return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-6">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <div className="text-8xl mb-4">😢</div>
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                We'll miss you!
              </h1>
              <p className="text-xl text-gray-600 mb-8">
                Hope you can join us next time!
              </p>
              
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <p className="text-gray-700 mb-4">
                  Thanks for letting us know, {friendName}! 👋
                </p>
                <p className="text-sm text-gray-500">
                  We'll share photos from dinner!
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // PREFERENCES FORM - Show if user confirmed attendance
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              🍽️ Your Restaurant Preferences
            </h1>
            <p className="text-gray-600">
              Tell us what works for you - we'll find the perfect spot!
            </p>
            {session && (
              <p className="text-sm text-orange-600 mt-2">
                📍 Planning for {session.city}
              </p>
            )}
          </div>

          {inviteLink && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm font-semibold text-blue-900 mb-2">
                📲 Share this link with your friends:
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inviteLink}
                  readOnly
                  className="flex-1 px-3 py-2 bg-white border border-blue-300 rounded text-sm"
                />
                <button
                  onClick={copyLink}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Copy
                </button>
              </div>
            </div>
          )}

          {/* RSVP STATUS DASHBOARD - Only for host */}
          {session && session.initiatorName && friendName === session.initiatorName && session.rsvps && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
              <p className="text-sm font-bold text-purple-900 mb-3">
                📊 RSVP Status:
              </p>
              
              {(() => {
                const rsvps = session.rsvps || [];
                const confirmed = rsvps.filter(r => r.status === 'yes');
                const declined = rsvps.filter(r => r.status === 'no');
                const totalInvited = session.numFriends;
                const pending = totalInvited - rsvps.length;

                return (
                  <div className="space-y-3 text-xs">
                    {confirmed.length > 0 && (
                      <div>
                        <p className="font-semibold text-green-900 mb-1">
                          ✅ Confirmed ({confirmed.length}):
                        </p>
                        <div className="ml-3 space-y-0.5 text-green-700">
                          {confirmed.map((rsvp, idx) => (
                            <div key={idx}>• {rsvp.name}</div>
                          ))}
                        </div>
                      </div>
                    )}

                    {declined.length > 0 && (
                      <div>
                        <p className="font-semibold text-red-900 mb-1">
                          ❌ Can't Make It ({declined.length}):
                        </p>
                        <div className="ml-3 space-y-0.5 text-red-700">
                          {declined.map((rsvp, idx) => (
                            <div key={idx}>• {rsvp.name}</div>
                          ))}
                        </div>
                      </div>
                    )}

                    {pending > 0 && (
                      <div>
                        <p className="font-semibold text-gray-700 mb-1">
                          ⏳ Pending ({pending}):
                        </p>
                        <div className="ml-3 text-gray-600">
                          <div>• Link not opened yet</div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {session && session.submissions && session.submissions.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-sm font-semibold text-green-900 mb-2">
                ✅ {session.submissions.length} friend(s) submitted preferences
              </p>
              <div className="text-xs text-green-700 space-y-1">
                {session.submissions.map((sub, idx) => (
                  <div key={idx}>• {sub.collaboratorName}</div>
                ))}
              </div>
              
              {/* Only show generate button to HOST (initiator) */}
              {(() => {
                if (!session.initiatorName || friendName !== session.initiatorName) return null;
                
                const confirmedRsvps = (session.rsvps || []).filter(r => r.status === 'yes').length;
                const hasEnoughPeople = confirmedRsvps >= 2;
                
                if (!hasEnoughPeople) {
                  return (
                    <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                      ⏳ Waiting for at least 2 people to confirm attendance...
                    </div>
                  );
                }
                
                return (
                  <>
                    {session.synthesis && session.synthesisGeneratedAt && (
                      // Check if there are new submissions after last generation
                      (() => {
                        const newSubmissions = session.submissions.filter(
                          sub => new Date(sub.submittedAt) > new Date(session.synthesisGeneratedAt)
                        );
                        return newSubmissions.length > 0 ? (
                          <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-800">
                            🆕 {newSubmissions.length} new friend(s) joined since last recommendation!
                          </div>
                        ) : null;
                      })()
                    )}
                    <button
                      onClick={generateRecommendations}
                      disabled={isGenerating || session.submissions.length === 0}
                      className="mt-3 w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold disabled:opacity-50"
                    >
                      {isGenerating 
                        ? '🔄 Finding restaurants...' 
                        : session.synthesis 
                          ? '🔄 Re-generate Recommendations' 
                          : '🍽️ Get Recommendations Now!'}
                    </button>
                  </>
                );
              })()}
              
              {/* Message for non-hosts */}
              {session.initiatorName && friendName && friendName !== session.initiatorName && !session.synthesis && (
                <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                  ⏳ Waiting for {session.initiatorName} to generate recommendations...
                </div>
              )}
            </div>
          )}

          {/* Only show preference form if user hasn't submitted yet */}
          {!session?.submissions?.some(sub => sub.collaboratorName.toLowerCase() === friendName.toLowerCase()) && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  value={friendName}
                  onChange={(e) => setFriendName(e.target.value)}
                  placeholder="e.g., Raj"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  📍 Where are you coming from?
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Koramangala, MG Road, Whitefield"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter your area, landmark, or neighborhood
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  🍽️ Food Preferences
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={isVeg}
                      onChange={(e) => setIsVeg(e.target.checked)}
                      className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
                    />
                    <span className="ml-3 text-gray-700">Vegetarian only (I don't eat meat/eggs)</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={noAlcohol}
                      onChange={(e) => setNoAlcohol(e.target.checked)}
                      className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
                    />
                    <span className="ml-3 text-gray-700">Prefer no alcohol at the restaurant</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={nearMetro}
                      onChange={(e) => setNearMetro(e.target.checked)}
                      className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
                    />
                    <span className="ml-3 text-gray-700">Prefer near Metro station</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  💰 Budget per person
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: '500-800', label: '₹500-800' },
                    { value: '800-1200', label: '₹800-1200' },
                    { value: '1000-1500', label: '₹1000-1500' },
                    { value: '1500-2500', label: '₹1500-2500' }
                  ].map(option => (
                    <label
                      key={option.value}
                      className={`flex items-center justify-center py-3 px-4 border-2 rounded-lg cursor-pointer transition-all ${
                        budget === option.value
                          ? 'border-orange-600 bg-orange-50 text-orange-900 font-semibold'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-orange-300'
                      }`}
                    >
                      <input
                        type="radio"
                        value={option.value}
                        checked={budget === option.value}
                        onChange={(e) => setBudget(e.target.value)}
                        className="sr-only"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  ⏰ What time can you reach?
                </label>
                <input
                  type="time"
                  value={arrivalTime}
                  onChange={(e) => setArrivalTime(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  📝 Any other requirements? (Optional)
                </label>
                <textarea
                  value={otherPrefs}
                  onChange={(e) => setOtherPrefs(e.target.value)}
                  placeholder="e.g., Need outdoor seating, Prefer Italian, Need parking"
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                />
              </div>

              <button
                onClick={submitInput}
                disabled={isSubmitting}
                className="w-full py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg font-bold text-lg hover:from-orange-700 hover:to-red-700 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : '✅ Submit My Preferences'}
              </button>
            </div>
          </div>
          )}

          {/* Show confirmation if user already submitted */}
          {session?.submissions?.some(sub => sub.collaboratorName.toLowerCase() === friendName.toLowerCase()) && (
            <div className="bg-green-50 border-2 border-green-300 rounded-2xl shadow-lg p-8 text-center">
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-2xl font-bold text-green-900 mb-2">
                You're all set, {friendName}!
              </h2>
              <p className="text-green-700 mb-4">
                Your preferences have been submitted.
              </p>
              {session.initiatorName && friendName !== session.initiatorName && !session.synthesis && (
                <p className="text-sm text-green-600">
                  ⏳ Waiting for {session.initiatorName} to generate recommendations...
                </p>
              )}
            </div>
          )}

          <div className="mt-6 text-center">
            <button
              onClick={resetSession}
              className="text-sm text-gray-600 hover:text-gray-900 underline"
            >
              Start a new plan
            </button>
          </div>
        </div>
      </div>
    );
  }

  // RESULTS MODE - Show recommendations
  if (mode === 'results') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              🎯 Your Perfect Spots!
            </h1>
            <p className="text-gray-600">
              Based on everyone's preferences in {session?.city}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
            <div className="prose max-w-none">
              <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                {recommendations}
              </div>
            </div>
          </div>

          <div className="flex gap-4 justify-center">
            <button
              onClick={resetSession}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold"
            >
              🔄 Plan Another Meetup
            </button>
            <button
              onClick={copyLink}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              📲 Share Results
            </button>
          </div>

          {session && session.submissions && (
            <div className="mt-6 bg-white rounded-lg p-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">
                Based on preferences from:
              </p>
              <div className="flex flex-wrap gap-2">
                {session.submissions.map((sub, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm"
                  >
                    {sub.collaboratorName}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}