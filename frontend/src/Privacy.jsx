import React from 'react';

const Privacy = () => {
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

      {/* Privacy Policy Content */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
            <h1 className="text-4xl font-bold text-slate-900 mb-4">Privacy Policy</h1>
            <p className="text-slate-600 mb-8">Last updated: December 5, 2025</p>

            <div className="prose prose-slate max-w-none">
              {/* Introduction */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-4">Introduction</h2>
                <p className="text-slate-600 leading-relaxed mb-4">
                  CoPrompt ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our decision-making platform and services.
                </p>
                <p className="text-slate-600 leading-relaxed">
                  By using CoPrompt, you agree to the collection and use of information in accordance with this policy. If you do not agree with our policies and practices, please do not use our services.
                </p>
              </section>

              {/* Information We Collect */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-4">Information We Collect</h2>
                
                <h3 className="text-xl font-semibold text-slate-900 mb-3">Personal Information</h3>
                <p className="text-slate-600 leading-relaxed mb-4">
                  When you use CoPrompt, we may collect the following personal information:
                </p>
                <ul className="list-disc pl-6 text-slate-600 space-y-2 mb-4">
                  <li>Name and email address</li>
                  <li>Organization and role information</li>
                  <li>Contact information provided in forms</li>
                  <li>Session data and decision contexts you create</li>
                  <li>Documents you upload (PDFs, DOCX, XLSX)</li>
                  <li>Collaborator inputs and AI-generated analyses</li>
                </ul>

                <h3 className="text-xl font-semibold text-slate-900 mb-3">Usage Information</h3>
                <p className="text-slate-600 leading-relaxed mb-4">
                  We automatically collect certain information about your device and how you interact with CoPrompt:
                </p>
                <ul className="list-disc pl-6 text-slate-600 space-y-2">
                  <li>Browser type and version</li>
                  <li>IP address and location data</li>
                  <li>Pages visited and features used</li>
                  <li>Time and date of visits</li>
                  <li>Session duration and activity patterns</li>
                </ul>
              </section>

              {/* How We Use Your Information */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-4">How We Use Your Information</h2>
                <p className="text-slate-600 leading-relaxed mb-4">
                  We use the information we collect to:
                </p>
                <ul className="list-disc pl-6 text-slate-600 space-y-2">
                  <li>Provide, operate, and maintain our services</li>
                  <li>Process your decision sessions and generate AI-powered syntheses</li>
                  <li>Facilitate collaboration between stakeholders</li>
                  <li>Send you updates, notifications, and administrative messages</li>
                  <li>Improve and personalize your experience</li>
                  <li>Analyze usage patterns to enhance our platform</li>
                  <li>Detect and prevent fraud or abuse</li>
                  <li>Comply with legal obligations</li>
                </ul>
              </section>

              {/* AI Processing */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-4">AI Processing</h2>
                <p className="text-slate-600 leading-relaxed mb-4">
                  CoPrompt uses Claude AI (provided by Anthropic) to analyze documents and stakeholder inputs to generate decision syntheses. When you use our services:
                </p>
                <ul className="list-disc pl-6 text-slate-600 space-y-2">
                  <li>Your session data and uploaded documents are processed by Claude AI</li>
                  <li>AI processing is performed to generate insights and recommendations</li>
                  <li>We do not use your data to train AI models</li>
                  <li>AI-generated content is stored as part of your session records</li>
                </ul>
              </section>

              {/* Data Storage and Security */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-4">Data Storage and Security</h2>
                <p className="text-slate-600 leading-relaxed mb-4">
                  We implement appropriate technical and organizational measures to protect your information:
                </p>
                <ul className="list-disc pl-6 text-slate-600 space-y-2 mb-4">
                  <li>Data is stored on secure cloud infrastructure (Firebase/Google Cloud)</li>
                  <li>All data transmission is encrypted using SSL/TLS</li>
                  <li>Access to personal data is restricted to authorized personnel only</li>
                  <li>Regular security audits and updates are performed</li>
                  <li>Session data is preserved for audit trail purposes</li>
                </ul>
                <p className="text-slate-600 leading-relaxed">
                  However, no method of transmission over the internet or electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your information, we cannot guarantee absolute security.
                </p>
              </section>

              {/* Data Sharing */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-4">Data Sharing and Disclosure</h2>
                <p className="text-slate-600 leading-relaxed mb-4">
                  We do not sell your personal information. We may share your information in the following circumstances:
                </p>
                <ul className="list-disc pl-6 text-slate-600 space-y-2">
                  <li><strong>With Collaborators:</strong> Session data is shared with invited collaborators as part of the decision-making process</li>
                  <li><strong>Service Providers:</strong> We use third-party services (Firebase, Claude AI, Vercel) to operate our platform</li>
                  <li><strong>Legal Requirements:</strong> We may disclose information to comply with legal obligations or protect our rights</li>
                  <li><strong>Business Transfers:</strong> In the event of a merger or acquisition, your information may be transferred</li>
                </ul>
              </section>

              {/* Your Rights */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-4">Your Rights</h2>
                <p className="text-slate-600 leading-relaxed mb-4">
                  Depending on your location, you may have the following rights:
                </p>
                <ul className="list-disc pl-6 text-slate-600 space-y-2">
                  <li><strong>Access:</strong> Request access to your personal information</li>
                  <li><strong>Correction:</strong> Request correction of inaccurate information</li>
                  <li><strong>Deletion:</strong> Request deletion of your personal information</li>
                  <li><strong>Objection:</strong> Object to processing of your information</li>
                  <li><strong>Data Portability:</strong> Request transfer of your data</li>
                  <li><strong>Withdraw Consent:</strong> Withdraw consent for data processing</li>
                </ul>
                <p className="text-slate-600 leading-relaxed mt-4">
                  To exercise these rights, please contact us at hello@coprompt.net
                </p>
              </section>

              {/* Data Retention */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-4">Data Retention</h2>
                <p className="text-slate-600 leading-relaxed">
                  We retain your personal information for as long as necessary to provide our services and fulfill the purposes outlined in this policy. Session data and decision records are retained to maintain audit trails and support ongoing decision-making processes. You may request deletion of your data at any time, subject to legal retention requirements.
                </p>
              </section>

              {/* Cookies */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-4">Cookies and Tracking</h2>
                <p className="text-slate-600 leading-relaxed mb-4">
                  We use cookies and similar tracking technologies to enhance your experience:
                </p>
                <ul className="list-disc pl-6 text-slate-600 space-y-2">
                  <li><strong>Essential Cookies:</strong> Required for the platform to function properly</li>
                  <li><strong>Analytics Cookies:</strong> Help us understand how you use our services</li>
                  <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
                </ul>
                <p className="text-slate-600 leading-relaxed mt-4">
                  You can control cookies through your browser settings, but disabling them may affect functionality.
                </p>
              </section>

              {/* Children's Privacy */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-4">Children's Privacy</h2>
                <p className="text-slate-600 leading-relaxed">
                  CoPrompt is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from children. If you become aware that a child has provided us with personal information, please contact us, and we will take steps to delete such information.
                </p>
              </section>

              {/* International Users */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-4">International Data Transfers</h2>
                <p className="text-slate-600 leading-relaxed">
                  Your information may be transferred to and processed in countries other than your own. These countries may have different data protection laws. By using CoPrompt, you consent to the transfer of your information to our facilities and service providers globally.
                </p>
              </section>

              {/* Changes to Policy */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-4">Changes to This Privacy Policy</h2>
                <p className="text-slate-600 leading-relaxed">
                  We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date. You are advised to review this Privacy Policy periodically for any changes. Changes are effective when posted.
                </p>
              </section>

              {/* Contact */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-4">Contact Us</h2>
                <p className="text-slate-600 leading-relaxed mb-4">
                  If you have questions or concerns about this Privacy Policy or our data practices, please contact us:
                </p>
                <div className="bg-slate-50 rounded-lg p-6">
                  <p className="text-slate-700 mb-2"><strong>Email:</strong> hello@coprompt.net</p>
                  <p className="text-slate-700"><strong>Website:</strong> coprompt.net</p>
                </div>
              </section>

              {/* Effective Date */}
              <section className="mt-12 pt-8 border-t border-slate-200">
                <p className="text-slate-500 text-sm">
                  This Privacy Policy was last updated on December 5, 2025, and is effective immediately.
                </p>
              </section>
            </div>

            {/* Back Button */}
            <div className="mt-12 text-center">
              <button
                onClick={goHome}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Privacy;
