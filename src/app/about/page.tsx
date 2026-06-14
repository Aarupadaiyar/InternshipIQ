'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import NavBar from '@/components/NavBar'

export default function AboutPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsLoggedIn(!!localStorage.getItem('token'))
    }
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', transition: 'background 0.3s, color 0.3s' }}>
      
      {/* Navigation Bar */}
      <NavBar />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '5rem 2rem' }}>
        
        {/* HERO SECTION */}
        <section style={{ textAlign: 'center', marginBottom: '6rem', position: 'relative' }}>
          <div 
            className="neo-badge"
            style={{ 
              background: 'var(--amber)', 
              color: '#000000',
              padding: '6px 14px', 
              marginBottom: '1.5rem', 
              transform: 'rotate(-1.5deg)',
              display: 'inline-block',
              fontWeight: 900
            }}
          >
            🤖 POWERED BY INTELLIGENT MATCHING
          </div>
          <h1 
            className="font-display" 
            style={{ 
              fontSize: 'clamp(38px, 5vw, 68px)', 
              lineHeight: '1.05', 
              marginBottom: '2rem', 
              textTransform: 'uppercase',
              letterSpacing: '-0.02em',
              fontWeight: 900
            }}
          >
            Find Better Internships<br />
            <span style={{ background: 'var(--indigo)', color: '#000000', padding: '2px 12px', border: '3px solid var(--border)', boxShadow: '3px 3px 0px var(--shadow)', display: 'inline-block', transform: 'rotate(1deg)', marginTop: '8px' }}>
              Smarter with AI
            </span>
          </h1>
          <p style={{ fontSize: 18, color: 'var(--text-2)', lineHeight: 1.6, maxWidth: 650, margin: '0 auto 2.5rem', fontWeight: 700 }}>
            InternshipIQ helps students discover internships, jobs, and opportunities tailored to their skills, interests, and career goals.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/jobs" style={{ textDecoration: 'none' }}>
              <button className="neo-btn" style={{ padding: '14px 32px', fontSize: 15, background: 'var(--indigo)' }}>Explore Opportunities</button>
            </Link>
            <Link href={isLoggedIn ? "/dashboard" : "/onboarding"} style={{ textDecoration: 'none' }}>
              <button className="neo-btn" style={{ padding: '14px 32px', fontSize: 15, background: 'var(--amber)' }}>Upload Resume</button>
            </Link>
          </div>
        </section>

        {/* WHAT IS INTERNSHIPIQ SECTION */}
        <section style={{ marginBottom: '6rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <p className="font-mono" style={{ fontSize: 11, color: 'var(--amber)', letterSpacing: '0.12em', fontWeight: 900, marginBottom: '0.5rem' }}>THE PLATFORM</p>
            <h2 className="font-display" style={{ fontSize: 36, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>What is InternshipIQ?</h2>
          </div>
          <div className="neo-card" style={{ padding: '3rem 2rem', background: 'var(--bg-2)', textAlign: 'center', marginBottom: '3rem' }}>
            <p style={{ fontSize: 17, color: 'var(--text)', lineHeight: 1.8, maxWidth: 800, margin: '0 auto', fontWeight: 700 }}>
              InternshipIQ is an AI-powered internship discovery and recommendation platform that aggregates opportunities from multiple sources into one place. Rather than manually parsing dozens of career boards daily, we use intelligent automation and analysis pipelines to screen listings and calculate precise alignment ratings for your specific background.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            {[
              { title: 'Internship Discovery', desc: 'Scan through thousands of listings across multiple portals, synced dynamically in real time.' },
              { title: 'Job Discovery', desc: 'Identify early-career developer and corporate listings mapped directly from top recruiters.' },
              { title: 'Resume Analysis', desc: 'Utilize automated extraction models to capture educational degrees, projects, and work history details.' },
              { title: 'Skill Matching', desc: 'Compare required listing criteria with your current skills instantly to show compatibility.' },
              { title: 'Personalized Recommendations', desc: 'A custom dashboard ranking new listings based on your target locations, roles, and domain preferences.' }
            ].map((item, idx) => (
              <div key={idx} className="neo-card" style={{ padding: '1.5rem', background: 'var(--bg-3)', transform: idx % 2 === 0 ? 'rotate(-0.5deg)' : 'rotate(0.5deg)' }}>
                <h3 style={{ fontSize: 16, fontWeight: 900, marginBottom: 8, textTransform: 'uppercase', color: 'var(--indigo)' }}>{item.title}</h3>
                <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5, fontWeight: 700 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* WORKFLOW VISUALIZATION */}
        <section style={{ marginBottom: '6rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <p className="font-mono" style={{ fontSize: 11, color: 'var(--amber)', letterSpacing: '0.12em', fontWeight: 900, marginBottom: '0.5rem' }}>DATA PIPELINE</p>
            <h2 className="font-display" style={{ fontSize: 36, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>Platform Workflow</h2>
          </div>
          
          {/* Brutalist visual timeline */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, alignItems: 'center', justifyContent: 'center', background: 'var(--bg-3)', padding: '2rem 1.5rem', border: '4px solid var(--border)', boxShadow: '6px 6px 0px var(--shadow)' }}>
            {[
              { label: 'Resume/Profile', step: '01', color: 'var(--indigo)' },
              { label: 'Skill Analysis', step: '02', color: 'var(--neo-violet)' },
              { label: 'AI Matching Engine', step: '03', color: 'var(--amber)' },
              { label: 'Opportunity Ranking', step: '04', color: 'var(--green)' },
              { label: 'Recommended Internships', step: '05', color: 'var(--indigo)' },
              { label: 'Application', step: '06', color: 'var(--amber)' }
            ].map((w, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', flexDirection: 'column', position: 'relative' }}>
                <div 
                  className="neo-card" 
                  style={{ 
                    padding: '12px 10px', 
                    textAlign: 'center', 
                    width: '100%', 
                    background: 'var(--bg-2)', 
                    borderColor: 'var(--border)', 
                    boxShadow: '3px 3px 0px var(--shadow)',
                    height: 100,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <span className="font-mono" style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 900 }}>{w.step}</span>
                  <div style={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase', color: 'var(--text)' }}>{w.label}</div>
                  <div style={{ height: 4, background: w.color, marginTop: 4 }} />
                </div>
                {idx < 5 && (
                  <div style={{ 
                    fontSize: 20, 
                    fontWeight: 900, 
                    color: 'var(--border)', 
                    margin: '10px 0', 
                    transform: 'rotate(90deg)', 
                    display: 'block' 
                  }} className="md:hidden">
                    ➔
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS SECTION */}
        <section style={{ marginBottom: '6rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <p className="font-mono" style={{ fontSize: 11, color: 'var(--amber)', letterSpacing: '0.12em', fontWeight: 900, marginBottom: '0.5rem' }}>PROCESS</p>
            <h2 className="font-display" style={{ fontSize: 36, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>How It Works</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { step: 'Step 1', title: 'Create an account.', desc: 'Sign up in seconds to secure your personal dashboard, job preferences, and database settings.' },
              { step: 'Step 2', title: 'Upload your resume or profile.', desc: 'Submit your CV document (PDF, DOCX, or TXT) to initialize the resume indexing framework.' },
              { step: 'Step 3', title: 'AI extracts skills and experience.', desc: 'Our multi-stage parser captures your technologies, education, projects, certifications, and achievements, with fallback OCR options.' },
              { step: 'Step 4', title: 'System matches relevant opportunities.', desc: 'Our matching model filters thousands of active job opportunities, calculating a match index across five core compatibility metrics.' },
              { step: 'Step 5', title: 'Apply directly through provided links.', desc: 'Review active recommendations and navigate directly to official applicant portals (LinkedIn, Internshala, Unstop) to submit your CV.' }
            ].map((s, idx) => (
              <div key={idx} className="neo-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: 20, background: 'var(--bg-2)', transform: idx % 2 === 0 ? 'rotate(-0.3deg)' : 'rotate(0.3deg)' }}>
                <div style={{ width: 44, height: 44, background: 'var(--amber)', border: '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 13, color: '#000000', fontFamily: 'Space Grotesk', flexShrink: 0, boxShadow: '2px 2px 0px var(--shadow)' }}>
                  {idx + 1}
                </div>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 900, textTransform: 'uppercase', color: 'var(--text)' }}>{s.step}: {s.title}</h3>
                  <p style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 700, marginTop: 2 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* KEY FEATURES */}
        <section style={{ marginBottom: '6rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <p className="font-mono" style={{ fontSize: 11, color: 'var(--amber)', letterSpacing: '0.12em', fontWeight: 900, marginBottom: '0.5rem' }}>FEATURES</p>
            <h2 className="font-display" style={{ fontSize: 36, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>Key Features</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
            {[
              { n: '⚡', title: 'AI Recommendation Core', desc: 'Complex scoring mapping your active profile against live job descriptions.' },
              { n: '📄', title: 'Automated Resume Parsing', desc: 'Secure technology extraction and structural layout indexing.' },
              { n: '🔍', title: 'Technology Extraction', desc: 'Fuzzy word comparisons standardizing technical stack names.' },
              { n: '⚙️', title: 'Advanced Search Filters', desc: 'Segment listings by salary limits, locations, companies, and work mode.' },
              { n: '🌐', title: 'Aggregated Listings', desc: 'Unified database indexing from LinkedIn, Internshala, and corporate pages.' },
              { n: '📊', title: 'Personalized Dashboard', desc: 'Real-time monitoring of match score alignments, listings, and trends.' },
              { n: '⏰', title: 'Daily Discoveries', desc: 'Automated scraping pipelines searching for new options every 24 hours.' },
              { n: '🎓', title: 'Career Growth Support', desc: 'Detailed skill gap reports, learning pathways, and practice projects.' }
            ].map((f, idx) => (
              <div key={idx} className="neo-card" style={{ padding: '1.5rem', background: 'var(--bg-3)', transform: idx % 2 === 0 ? 'rotate(-0.5deg)' : 'rotate(0.5deg)' }}>
                <span style={{ fontSize: 24, display: 'inline-block', marginBottom: 12 }}>{f.n}</span>
                <h3 style={{ fontSize: 15, fontWeight: 900, textTransform: 'uppercase', marginBottom: 6 }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5, fontWeight: 700 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* WHY USE INTERNSHIPIQ */}
        <section style={{ marginBottom: '6rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <p className="font-mono" style={{ fontSize: 11, color: 'var(--amber)', letterSpacing: '0.12em', fontWeight: 900, marginBottom: '0.5rem' }}>ADVANTAGES</p>
            <h2 className="font-display" style={{ fontSize: 36, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>Why Use InternshipIQ?</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
            {[
              { num: '01', title: 'Saves time searching manually.', text: 'Skip browsing multiple career portals. Our pipeline collects and indexes them into one unified, structured feed.' },
              { num: '02', title: 'Finds relevant opportunities faster.', text: 'Instant compatibility matching highlights the best-fit opportunities on page one so you apply to high-chance options first.' },
              { num: '03', title: 'Helps discover hidden opportunities.', text: 'Aggregates listings from direct company career pages that rarely get indexed on general job boards.' },
              { num: '04', title: 'Reduces information overload.', text: 'Matches you against target preferences, filtering out irrelevant listings, locations, and spam listings.' },
              { num: '05', title: 'Improves internship search efficiency.', text: 'Pinpoint exactly which skills are blocking you from roles, study our guides, and apply with high confidence.' }
            ].map((item, idx) => (
              <div key={idx} className="neo-card" style={{ padding: '2rem 1.5rem', background: 'var(--bg-2)', transform: idx % 2 === 0 ? 'rotate(-0.8deg)' : 'rotate(0.8deg)' }}>
                <div className="font-mono" style={{ fontSize: 24, fontWeight: 900, color: 'var(--indigo)', marginBottom: 8 }}>{item.num}</div>
                <h3 style={{ fontSize: 16, fontWeight: 900, textTransform: 'uppercase', marginBottom: 8 }}>{item.title}</h3>
                <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5, fontWeight: 700 }}>{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* MISSION STATEMENT CARD */}
        <section style={{ marginBottom: '6rem' }}>
          <div className="neo-card" style={{ padding: '3.5rem 2rem', background: 'var(--amber-dim)', border: '4px solid var(--border)', boxShadow: '8px 8px 0px var(--shadow)', textAlign: 'center', transform: 'rotate(-0.5deg)' }}>
            <span className="neo-badge" style={{ background: 'var(--amber)', color: '#000000', fontSize: 11, padding: '4px 12px', fontWeight: 900, marginBottom: '1.5rem' }}>OUR MISSION</span>
            <p className="font-display" style={{ fontSize: 'clamp(20px, 3.5vw, 32px)', fontWeight: 900, textTransform: 'uppercase', lineHeight: 1.3, maxWidth: 900, margin: '0 auto', color: 'var(--text)' }}>
              "Our mission is to help students and early-career professionals discover the right opportunities faster through intelligent technology and personalized recommendations."
            </p>
          </div>
        </section>

        {/* FUTURE ROADMAP */}
        <section style={{ marginBottom: '5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <p className="font-mono" style={{ fontSize: 11, color: 'var(--amber)', letterSpacing: '0.12em', fontWeight: 900, marginBottom: '0.5rem' }}>THE HORIZON</p>
            <h2 className="font-display" style={{ fontSize: 36, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>Future Roadmap</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            {[
              { icon: '🧠', title: 'Better AI Recommendations', desc: 'Incorporate deep semantic matching checking project descriptions against job responsibilities.' },
              { icon: '🌍', title: 'Global Internship Coverage', desc: 'Expand aggregation pipelines to scrape developer listings across Europe, Americas, and APAC.' },
              { icon: '⚡', title: 'Advanced Skill-Gap Analysis', desc: 'Deep linking matching standard roles directly with courses, roadmaps, and online learning modules.' },
              { icon: '📝', title: 'Resume Improvement Suggestions', desc: 'Real-time resume scoring providing edits, formatting updates, and tech suggestions.' },
              { icon: '💬', title: 'Email & WhatsApp Notifications', desc: 'Immediate instant messaging notifications notifying you when a matching job is scraped.' },
              { icon: '📈', title: 'Career Analytics Dashboard', desc: 'Track your application status, views, responses, and skills progress over time.' }
            ].map((r, idx) => (
              <div key={idx} className="neo-card" style={{ padding: '1.5rem', background: 'var(--bg-3)', transform: idx % 2 === 0 ? 'rotate(-0.5deg)' : 'rotate(0.5deg)' }}>
                <span style={{ fontSize: 24, display: 'inline-block', marginBottom: 12 }}>{r.icon}</span>
                <h3 style={{ fontSize: 15, fontWeight: 900, textTransform: 'uppercase', marginBottom: 6 }}>{r.title}</h3>
                <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5, fontWeight: 700 }}>{r.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA FOOTER */}
        <section style={{ textAlign: 'center', padding: '4rem 2rem', borderTop: '4px solid var(--border)' }}>
          <h2 className="font-display" style={{ fontSize: 36, fontWeight: 900, textTransform: 'uppercase', marginBottom: '1.5rem' }}>
            Ready to find your match?
          </h2>
          <Link href={isLoggedIn ? "/dashboard" : "/signup"} style={{ textDecoration: 'none' }}>
            <button className="neo-btn" style={{ padding: '16px 40px', fontSize: 15, background: 'var(--indigo)' }}>
              {isLoggedIn ? "Go to your Dashboard →" : "Get started for free →"}
            </button>
          </Link>
        </section>

      </div>

      {/* FOOTER */}
      <footer style={{ borderTop: '4px solid var(--border)', padding: '2rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <span className="font-mono" style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 900 }}>INTERNSHIPIQ © 2026</span>
          <span style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 900, textTransform: 'uppercase' }}>Built for students and early careers.</span>
        </div>
      </footer>

    </div>
  )
}
