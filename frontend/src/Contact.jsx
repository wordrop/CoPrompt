import React, { useState } from 'react';
import { db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.name || !formData.email || !formData.message) {
      setError('Please fill in all fields');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Save to Firebase
      await addDoc(collection(db, 'contact-submissions'), {
        name: formData.name,
        email: formData.email,
        message: formData.message,
        submittedAt: new Date().toISOString(),
        status: 'new'
      });

      // Success!
      setSubmitted(true);
      setFormData({ name: '', email: '', message: '' });
    } catch (err) {
      console.error('Error submitting form:', err);
      setError('Something went wrong. Please try again or email us directly at hello@coprompt.net');
    } finally {
      setIsSubmitting(false);
    }
  };

  const goHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/95 backdrop-blur-sm border-b border-slate-200 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button onClick={goHome} className="flex items-center">
              <h1 className="text-2xl font-bold text-slate-800">CoPrompt</h1>
            </button>
            <button 
              onClick={goHome}
              className="text-slate-600 hover:text-slate-900 font-medium"
            >
              ← Back to Home
            </button>
          </div>
        </div>
      </nav>

      {/* Contact Form */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Get in Touch</h2>
            <p className="text-xl text-slate-600">
              Have questions? Want to learn more? We'd love to hear from you.
            </p>
          </div>

          {submitted ? (
            // Success Message
            <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-8 text-center">
              <div className="text-6xl mb-4">✅</div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Thank You!</h3>
              <p className="text-lg text-slate-600 mb-6">
                We've received your message and will get back to you within 24 hours.
              </p>
              <button
                onClick={goHome}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Back to Home
              </button>
            </div>
          ) : (
            // Contact Form
            <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name Field */}
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-2">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="John Doe"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Email Field */}
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">
                    Your Email *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="john@company.com"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Message Field */}
                <div>
                  <label htmlFor="message" className="block text-sm font-semibold text-slate-700 mb-2">
                    Your Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Tell us what you're thinking..."
                    rows="6"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Error Message */}
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600">{error}</p>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full py-4 rounded-lg text-lg font-semibold transition-colors ${
                    isSubmitting
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isSubmitting ? 'Sending...' : 'Send Message'}
                </button>
              </form>

              {/* Alternative Contact */}
              <div className="mt-8 pt-8 border-t border-slate-200 text-center">
                <p className="text-slate-600 mb-2">Or email us directly:</p>
                <a 
                  href="mailto:hello@coprompt.net" 
                  className="text-blue-600 hover:text-blue-700 font-semibold"
                >
                  hello@coprompt.net
                </a>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Contact;
