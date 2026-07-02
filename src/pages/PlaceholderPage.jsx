import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Info, Briefcase, Shield, CheckCircle, Mail, HelpCircle, ChevronDown, ChevronUp, Clock, Award, Star, Compass, Users, Heart, Send } from 'lucide-react';

export default function PlaceholderPage() {
  const { pageId } = useParams();
  const navigate = useNavigate();

  // FAQ open/close state
  const [openFaq, setOpenFaq] = useState({});

  // Career form state
  const [careerSubmitted, setCareerSubmitted] = useState(false);
  const [careerForm, setCareerForm] = useState({
    name: '',
    email: '',
    role: 'Software Engineer',
    portfolio: '',
    message: ''
  });

  const toggleFaq = (index) => {
    setOpenFaq(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleCareerSubmit = (e) => {
    e.preventDefault();
    if (careerForm.name && careerForm.email) {
      setCareerSubmitted(true);
    }
  };

  // Convert "payment-methods" to "Payment Methods"
  const title = pageId 
    ? pageId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    : 'Page Not Found';

  const renderContent = () => {
    switch (pageId) {
      case 'about-us':
        return (
          <div className="animate-fade-up" style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '3rem' }}>
            {/* Hero Section */}
            <div className="card glass" style={{ padding: '3rem 2rem', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)', border: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: '2.25rem', fontWeight: 800, marginBottom: '1.5rem', background: 'linear-gradient(to right, var(--primary), #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Redefining Home Services
              </h2>
              <p style={{ fontSize: '1.2rem', lineHeight: '1.8', color: 'var(--text-main)', maxWidth: '800px' }}>
                Tandem is on a mission to connect customers with premium, vetted, and trusted home service professionals instantly. We believe that booking a home repair, clean, or installation should be as simple as ordering a ride. By leveraging state-of-the-art dispatch algorithms and real-time tracking, we provide absolute peace of mind and convenience.
              </p>
            </div>

            {/* Values / Key Features */}
            <div>
              <h3 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '2rem', textAlign: 'center' }}>Our Core Pillars</h3>
              <div className="grid-3">
                <div className="card glass" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--primary-bg)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Shield size={24} />
                  </div>
                  <h4 style={{ fontWeight: 700, fontSize: '1.25rem' }}>Trust & Safety First</h4>
                  <p style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>
                    Every provider undergoes a rigorous 10-point check and background check. Your safety is our absolute commitment.
                  </p>
                </div>

                <div className="card glass" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Clock size={24} />
                  </div>
                  <h4 style={{ fontWeight: 700, fontSize: '1.25rem' }}>Instant Dispatch</h4>
                  <p style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>
                    No more endless calls and quotes. Get matched with top rated local professionals in seconds.
                  </p>
                </div>

                <div className="card glass" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Award size={24} />
                  </div>
                  <h4 style={{ fontWeight: 700, fontSize: '1.25rem' }}>Uncompromising Quality</h4>
                  <p style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>
                    We guarantee outstanding performance. If you are not satisfied, we will work until it is right.
                  </p>
                </div>
              </div>
            </div>

            {/* History Section */}
            <div className="card glass" style={{ padding: '2.5rem' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Compass size={24} color="var(--primary)" /> Our Journey
              </h3>
              <p style={{ color: 'var(--text-muted)', lineHeight: '1.7', marginBottom: '1rem' }}>
                Founded in 2024, Tandem began as a response to the frustrating and outdated process of hiring home contractors. What started as a local handyperson matcher has quickly grown into a comprehensive service platform covering everything from plumbing and electrical work to smart home setups and cleaning.
              </p>
              <p style={{ color: 'var(--text-muted)', lineHeight: '1.7' }}>
                Today, we serve thousands of households across the region, empowering local service professionals to build thriving independent businesses while giving homeowners reliable, top-tier service at a tap of a button.
              </p>
            </div>
          </div>
        );

      case 'careers':
        return (
          <div className="animate-fade-up" style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '3rem' }}>
            <div className="card glass" style={{ padding: '3rem 2rem', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(16, 185, 129, 0.05) 100%)' }}>
              <h2 style={{ fontSize: '2.25rem', fontWeight: 800, marginBottom: '1rem' }}>Join the Tandem Team</h2>
              <p style={{ fontSize: '1.15rem', color: 'var(--text-muted)', maxWidth: '750px', lineHeight: '1.6' }}>
                We're building the infrastructure for the future of local services. Work with an exceptionally talented team of designers, engineers, and ops specialists to solve challenging real-world problems.
              </p>
            </div>

            {/* Open Positions */}
            <div>
              <h3 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '1.5rem' }}>Open Roles</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="card glass" style={{ padding: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                    <h4 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Senior Software Engineer (Frontend / React)</h4>
                    <span className="badge active" style={{ background: 'var(--primary-bg)', color: 'var(--primary)' }}>Full-Time / Remote</span>
                  </div>
                  <p style={{ color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '1.5rem' }}>
                    Help build our high-performance customer web app and provider dashboard. Experience with React, Vite, and advanced styling systems is required. You will work on real-time maps, messaging pipelines, and gorgeous UI components.
                  </p>
                </div>

                <div className="card glass" style={{ padding: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                    <h4 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Director of Operations & Provider Success</h4>
                    <span className="badge active" style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}>Hybrid (NYC)</span>
                  </div>
                  <p style={{ color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '1.5rem' }}>
                    Oversee provider vetting, onboarding, and quality assurance workflows. You will scale our partner network, build regional operations frameworks, and make sure Tandem pros maintain a stellar average rating.
                  </p>
                </div>

                <div className="card glass" style={{ padding: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                    <h4 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Product Designer</h4>
                    <span className="badge active" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>Full-Time / Remote</span>
                  </div>
                  <p style={{ color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '1.5rem' }}>
                    Shape the visual identity and user flows for both customer and pro applications. We care deeply about aesthetics, transitions, animations, and making home services feel absolutely premium.
                  </p>
                </div>
              </div>
            </div>

            {/* Application Form */}
            <div className="card glass" style={{ padding: '2.5rem' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Mail size={24} color="var(--primary)" /> Express Interest
              </h3>
              
              {careerSubmitted ? (
                <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(16, 185, 129, 0.1)', borderRadius: 'var(--radius-md)', border: '1px solid var(--success)' }}>
                  <CheckCircle size={48} color="var(--success)" style={{ margin: '0 auto 1rem' }} />
                  <h4 style={{ fontWeight: 700, fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--success)' }}>Application Received!</h4>
                  <p style={{ color: 'var(--text-main)' }}>Thank you for applying. Our talent team will review your application and get in touch via email soon.</p>
                </div>
              ) : (
                <form onSubmit={handleCareerSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div className="grid-2" style={{ gap: '1.5rem' }}>
                    <div>
                      <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Full Name</label>
                      <input 
                        type="text" 
                        required
                        className="form-control" 
                        value={careerForm.name} 
                        onChange={(e) => setCareerForm({...careerForm, name: e.target.value})} 
                        placeholder="John Doe" 
                        style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Email Address</label>
                      <input 
                        type="email" 
                        required
                        className="form-control" 
                        value={careerForm.email} 
                        onChange={(e) => setCareerForm({...careerForm, email: e.target.value})} 
                        placeholder="john@example.com" 
                        style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Target Position</label>
                    <select 
                      className="form-control"
                      value={careerForm.role}
                      onChange={(e) => setCareerForm({...careerForm, role: e.target.value})}
                      style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)' }}
                    >
                      <option>Senior Software Engineer (Frontend / React)</option>
                      <option>Director of Operations & Provider Success</option>
                      <option>Product Designer</option>
                      <option>Other General Role</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Resume Link or Portfolio URL</label>
                    <input 
                      type="url" 
                      className="form-control" 
                      value={careerForm.portfolio} 
                      onChange={(e) => setCareerForm({...careerForm, portfolio: e.target.value})} 
                      placeholder="https://linkedin.com/in/username" 
                      style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Cover Note / Why Tandem?</label>
                    <textarea 
                      rows="4" 
                      className="form-control" 
                      value={careerForm.message} 
                      onChange={(e) => setCareerForm({...careerForm, message: e.target.value})} 
                      placeholder="Briefly tell us why you are excited to join the team..." 
                      style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-main)' }}
                    />
                  </div>
                  <button type="submit" className="btn-primary" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', alignSelf: 'flex-start' }}>
                    <Send size={16} /> Submit Application
                  </button>
                </form>
              )}
            </div>
          </div>
        );

      case 'safety':
        return (
          <div className="animate-fade-up" style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '3rem' }}>
            {/* Safety badge header */}
            <div className="card glass" style={{ display: 'flex', gap: '2rem', padding: '3rem 2rem', alignItems: 'center', flexWrap: 'wrap', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(99, 102, 241, 0.08) 100%)' }}>
              <div style={{ width: '96px', height: '96px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)' }}>
                <Shield size={56} />
              </div>
              <div style={{ flex: 1, minWidth: '280px' }}>
                <span className="badge active" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', marginBottom: '0.5rem', display: 'inline-block' }}>Tandem Guarded</span>
                <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>$1,000,000 Safety & Quality Guarantee</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', lineHeight: '1.6' }}>
                  Every service booked on Tandem is backed by our comprehensive insurance policy and strict provider vetting protocols. Your property and security are protected at all times.
                </p>
              </div>
            </div>

            {/* 10-Point check list */}
            <div>
              <h3 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '1.5rem', textAlign: 'center' }}>Tandem's 10-Point Background Check & Vetting</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', textAlign: 'center', maxWidth: '700px', margin: '0 auto 2rem' }}>
                Before any professional is allowed to accept jobs on our marketplace, they must pass our proprietary multi-layered vetting procedures.
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                {[
                  { title: "National Criminal Database Search", desc: "Detailed screening of federal, state, and county records." },
                  { title: "Sex Offender Registry Audit", desc: "Mandatory screening of all domestic registry databases." },
                  { title: "Identity Verification & SSN Check", desc: "Cross-checking official government IDs with registration details." },
                  { title: "Professional License Verification", desc: "Ensuring electrical, plumbing, and building licenses are valid." },
                  { title: "In-Person/Video Competency Interview", desc: "Technical skill check and communication review by team leads." },
                  { title: "Commercial General Liability Insurance", desc: "Mandatory requirement of active liability coverage." },
                  { title: "Historical Client Reference Reviews", desc: "Audit of historical ratings and reviews from previous platforms." },
                  { title: "Ongoing Random Quality Audits", desc: "Regular inspects of completed services and tools." },
                  { title: "Real-time Rating Monitoring", desc: "Deactivation threshold for pros dropping below 4.7 stars." },
                  { title: "Biometric Identity Re-checks", desc: "Periodic verification prompts upon opening the pro application." }
                ].map((item, index) => (
                  <div key={index} className="card glass" style={{ padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                    <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.25rem', width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {index + 1}
                    </div>
                    <div>
                      <h4 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.25rem' }}>{item.title}</h4>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem', lineHeight: '1.5' }}>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'help-center':
        return (
          <div className="animate-fade-up" style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '3rem' }}>
            <div className="card glass" style={{ padding: '3rem 2rem', textAlign: 'center', background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.05) 0%, rgba(99, 102, 241, 0.05) 100%)' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(168, 85, 247, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a855f7', margin: '0 auto 1.5rem' }}>
                <HelpCircle size={36} />
              </div>
              <h2 style={{ fontSize: '2.25rem', fontWeight: 800, marginBottom: '1rem' }}>Frequently Asked Questions</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.15rem', maxWidth: '600px', margin: '0 auto' }}>
                Need help with booking, cancellations, or becoming a partner? Find instant answers below or contact support.
              </p>
            </div>

            {/* Accordion FAQ */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
              {[
                {
                  q: "How do I book a service on Tandem?",
                  a: "Booking is extremely simple. From our home page, select the service category you need (e.g. plumbing, assembly). Fill out details about your project, select your preferred date/time, and pay. Our algorithm instantly matches you with the best-rated local pro in your area."
                },
                {
                  q: "How is pricing calculated for services?",
                  a: "Tandem operates on a flat-rate pricing structure. The price is determined by the specific type of service and the size/scope specified during booking. There are no hourly surprises or hidden equipment fees. The price you see during checkout is your final total."
                },
                {
                  q: "Who are the service providers?",
                  a: "Service providers on Tandem are fully vetted independent professionals, technicians, and local service businesses. Every provider is background-checked, credential-verified, and must maintain a rating of 4.7 stars or higher to remain on the platform."
                },
                {
                  q: "What is your cancellation and rescheduling policy?",
                  a: "You can cancel or reschedule any booking free of charge up to 24 hours before the service start time. Cancellations made within 24 hours may incur a small late-cancellation fee to compensate our providers for reserved time slots."
                },
                {
                  q: "How does the $1,000,000 safety guarantee work?",
                  a: "Tandem's safety guarantee covers up to $1,000,000 in property damage or injury resulting from a service booked and completed through our platform. We verify active liability insurance for all partners and step in to handle claims directly in rare case scenarios."
                },
                {
                  q: "How can I sign up as a service partner?",
                  a: "If you're a service professional looking to find new clients and grow your business, click the 'Become a Pro' link on our homepage or navigation menu. Complete the application, pass our vetting interview, and download the Pro App to begin receiving jobs immediately!"
                }
              ].map((item, index) => (
                <div key={index} className="card glass" style={{ padding: '0', overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <button 
                    onClick={() => toggleFaq(index)} 
                    style={{ 
                      width: '100%', 
                      padding: '1.5rem', 
                      background: 'none', 
                      border: 'none', 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontWeight: 600,
                      fontSize: '1.1rem',
                      color: 'var(--text-main)'
                    }}
                  >
                    <span>{item.q}</span>
                    {openFaq[index] ? <ChevronUp size={20} color="var(--primary)" /> : <ChevronDown size={20} color="var(--text-muted)" />}
                  </button>
                  
                  {openFaq[index] && (
                    <div style={{ 
                      padding: '0 1.5rem 1.5rem', 
                      color: 'var(--text-muted)', 
                      lineHeight: '1.6',
                      borderTop: '1px solid var(--border)',
                      paddingTop: '1.25rem',
                      fontSize: '0.975rem'
                    }}>
                      {item.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return (
          <div className="card glass animate-fade-up" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{ margin: '0 auto 2rem', width: '80px', height: '80px', background: 'var(--primary-bg)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
              <Info size={40} />
            </div>
            <h2 style={{ marginBottom: '1rem' }}>{title}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.25rem', maxWidth: '600px', margin: '0 auto' }}>
              This page is currently under construction for the Tandem MVP. 
              The full feature will be implemented in the native app release.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="container" style={{ padding: '6rem 1rem 5rem', minHeight: '100vh' }}>
      <button className="btn-outline" onClick={() => navigate(-1)} style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <ChevronLeft size={20} /> Back
      </button>

      {renderContent()}
    </div>
  );
}
