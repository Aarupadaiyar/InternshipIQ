'use client'
import { useState, useEffect } from 'react'
import NavBar from '@/components/NavBar'
import Link from 'next/link'
import { Check, X, CreditCard, Sparkles, Shield, Mail, Zap, Compass, AlertCircle } from 'lucide-react'

interface SubscriptionInfo {
  is_premium: boolean
  plan_type?: string
  premium_until?: string
}

export default function PricingPage() {
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState('')
  const [subInfo, setSubInfo] = useState<SubscriptionInfo>({ is_premium: false })
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null) // 'monthly' | 'yearly' | null

  // Fetch subscription status on load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('token')
      const storedEmail = localStorage.getItem('user_email') || ''
      setToken(storedToken)
      setUserEmail(storedEmail)

      if (storedToken) {
        fetch('http://localhost:8000/payments/status', {
          headers: { 'Authorization': `Bearer ${storedToken}` }
        })
          .then(res => {
            if (res.ok) return res.json()
            return { is_premium: false }
          })
          .then(data => {
            setSubInfo(data)
          })
          .catch(err => console.error(err))
          .finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    } else {
      setLoading(false)
    }
  }, [])

  // Dynamically load Razorpay SDK script
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    document.body.appendChild(script)
    return () => {
      document.body.removeChild(script)
    }
  }, [])

  const handleCheckout = async (planType: 'monthly' | 'yearly') => {
    if (!token) {
      window.location.href = '/login?redirect=/pricing'
      return
    }

    setCheckoutLoading(planType)
    setStatusMsg(null)

    try {
      // 1. Create Razorpay order on backend
      const orderRes = await fetch('http://localhost:8000/payments/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ plan_type: planType })
      })

      if (!orderRes.ok) throw new Error('Order creation failed')
      const orderData = await orderRes.json()

      // 2. Configure Razorpay checkout
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'InternshipIQ',
        description: `Premium ${planType === 'monthly' ? 'Monthly' : 'Yearly'} Plan`,
        image: '/developer-profile.png',
        order_id: orderData.order_id,
        handler: async (response: any) => {
          // 3. Verify payment signature on backend
          try {
            const verifyRes = await fetch('http://localhost:8000/payments/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature || '',
                plan_type: planType
              })
            })

            const verifyData = await verifyRes.json()
            if (verifyRes.ok) {
              setSubInfo({
                is_premium: true,
                plan_type: planType,
                premium_until: verifyData.premium_until
              })
              setStatusMsg({
                type: 'success',
                text: `Subscription activated! Welcome to InternshipIQ Premium (${planType.toUpperCase()}).`
              })
            } else {
              throw new Error(verifyData.detail || 'Verification failed')
            }
          } catch (err: any) {
            console.error(err)
            setStatusMsg({
              type: 'error',
              text: `Payment verification failed: ${err.message || 'Signature mismatch'}`
            })
          }
        },
        prefill: {
          email: userEmail
        },
        theme: {
          color: '#FF6B6B' // Pop red theme color matching globals
        },
        modal: {
          ondismiss: () => {
            setCheckoutLoading(null)
          }
        }
      }

      const rzp = new (window as any).Razorpay(options)
      rzp.on('payment.failed', (resp: any) => {
        setStatusMsg({
          type: 'error',
          text: `Payment failed: ${resp.error.description || 'Transaction declined'}`
        })
        setCheckoutLoading(null)
      })
      rzp.open()
    } catch (err) {
      console.error(err)
      setStatusMsg({
        type: 'error',
        text: 'Failed to initialize payment gateway. Please try again.'
      })
      setCheckoutLoading(null)
    }
  }

  const freeFeatures = [
    'Browse All Jobs',
    'Full-Text Keyword Search',
    'Source & Location Filters',
    'Resume Parsing Onboarding',
    'Basic Match Score Accuracy',
    'Direct Link To Applications'
  ]

  const premiumFeatures = [
    'Daily Personalized Match Digest (Email)',
    'Resume-Based Recommendation Rankings',
    'Priority Matching & Match Breakdown',
    'Advanced Search Filters (Experience, Stipend)',
    'Skill Gap Identification & Closing Tools',
    'Latest Jobs Added In The Previous 24h First',
    'Early Access To New Features'
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', transition: 'background 0.3s, color 0.3s', paddingBottom: '6rem' }}>
      <NavBar />

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '4rem 2rem' }}>
        
        {/* Header Title Section */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <span className="neo-badge" style={{ background: 'var(--amber)', color: '#000', fontSize: 12, fontWeight: 900, marginBottom: 16 }}>
            UPGRADE OPTIONS
          </span>
          <h1 className="font-display" style={{ fontSize: '40px', fontWeight: 900, textTransform: 'uppercase', margin: '0 0 12px 0' }}>
            Elevate Your Search
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: 15, fontWeight: 700, maxWidth: 540, margin: '0 auto' }}>
            Stop parsing boards manually. Unlock priority matching metrics and receive targeted digests to discover opportunities first.
          </p>
        </div>

        {/* Payment feedback messages */}
        {statusMsg && (
          <div className="neo-card" style={{
            padding: '1.25rem',
            marginBottom: '2rem',
            background: statusMsg.type === 'success' ? 'var(--green-dim)' : 'var(--red-dim)',
            borderColor: statusMsg.type === 'success' ? 'var(--green)' : 'var(--red)',
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}>
            {statusMsg.type === 'success' ? <Sparkles style={{ color: 'var(--green)' }} /> : <AlertCircle style={{ color: 'var(--red)' }} />}
            <span style={{ fontWeight: 900, textTransform: 'uppercase', fontSize: 13, color: 'var(--text)' }}>
              {statusMsg.text}
            </span>
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
            <div className="shimmer" style={{ width: 300, height: 180 }} />
          </div>
        ) : subInfo.is_premium ? (
          
          /* Active Subscription Panel */
          <div className="neo-card" style={{ padding: '2.5rem', background: 'var(--bg-2)', textAlign: 'center', border: '4px solid var(--border)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🏆</div>
            <h2 className="font-display" style={{ fontSize: 26, fontWeight: 900, textTransform: 'uppercase', color: 'var(--amber)', margin: '0 0 8px 0' }}>
              Premium Access Active
            </h2>
            <p className="font-mono" style={{ fontSize: 14, color: 'var(--text-3)', fontWeight: 900, textTransform: 'uppercase', marginBottom: 24 }}>
              Plan Type: {subInfo.plan_type === 'yearly' ? 'Yearly Membership' : 'Monthly Membership'}
            </p>
            
            <div style={{ maxWidth: 460, margin: '0 auto 30px auto', background: 'var(--bg-3)', border: '2px solid var(--border)', padding: '12px 18px', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                <span>STATUS:</span>
                <span style={{ color: 'var(--green)' }}>ACTIVE ✓</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700 }}>
                <span>RENEWAL DATE:</span>
                <span className="font-mono" style={{ color: 'var(--text)' }}>
                  {subInfo.premium_until ? new Date(subInfo.premium_until).toLocaleDateString() : '—'}
                </span>
              </div>
            </div>
            
            <Link href="/jobs" style={{ textDecoration: 'none' }}>
              <button className="neo-btn" style={{ padding: '12px 36px', background: 'var(--amber)' }}>
                Browse Ranked Opportunities &rarr;
              </button>
            </Link>
          </div>

        ) : (
          
          /* Comparison Cards Grid */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 28 }}>
            
            {/* Free Tier */}
            <div className="neo-card" style={{ padding: '2rem', background: 'var(--bg-2)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 460 }}>
              <div>
                <h3 className="font-display" style={{ fontSize: 22, fontWeight: 900, textTransform: 'uppercase', margin: '0 0 8px 0' }}>
                  Basic Plan
                </h3>
                <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 20 }}>
                  <span style={{ fontSize: 36, fontWeight: 900 }}>₹0</span>
                  <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 700, marginLeft: 6 }}>/ FOREVER</span>
                </div>
                
                <hr style={{ border: 'none', borderTop: '2px solid var(--border)', marginBottom: 20 }} />
                
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {freeFeatures.map(f => (
                    <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700 }}>
                      <Check size={14} style={{ color: 'var(--green)' }} />
                      <span>{f}</span>
                    </li>
                  ))}
                  {premiumFeatures.map(f => (
                    <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-3)', fontWeight: 700, opacity: 0.6 }}>
                      <X size={14} style={{ color: 'var(--red)' }} />
                      <span style={{ textDecoration: 'line-through' }}>{f.substring(0, 25)}...</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div style={{ marginTop: 30 }}>
                <Link href="/jobs" style={{ textDecoration: 'none' }}>
                  <button className="neo-btn" style={{ width: '100%', padding: '10px', background: 'var(--bg-3)', color: 'var(--text)' }}>
                    Start Browsing
                  </button>
                </Link>
              </div>
            </div>

            {/* Premium Tier */}
            <div className="neo-card" style={{ 
              padding: '2rem', 
              background: 'var(--bg-2)', 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'space-between',
              minHeight: 460,
              borderColor: 'var(--indigo)',
              boxShadow: '10px 10px 0px var(--indigo)'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <h3 className="font-display" style={{ fontSize: 22, fontWeight: 900, textTransform: 'uppercase', margin: 0, color: 'var(--indigo)' }}>
                    Premium Plan
                  </h3>
                  <span className="neo-badge" style={{ background: 'var(--indigo)', color: '#FFFFFF', fontSize: 9, padding: '2px 6px' }}>
                    MOST POPULAR
                  </span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <span style={{ fontSize: 32, fontWeight: 900 }}>₹299</span>
                    <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 700, marginLeft: 2 }}>/ MONTH</span>
                  </div>
                  <div style={{ borderLeft: '2px solid var(--border)', paddingLeft: 8, height: 24, display: 'inline-block' }} />
                  <div>
                    <span style={{ fontSize: 32, fontWeight: 900 }}>₹1,999</span>
                    <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 700, marginLeft: 2 }}>/ YEAR</span>
                  </div>
                </div>
                
                <hr style={{ border: 'none', borderTop: '2px solid var(--border)', marginBottom: 20 }} />
                
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {premiumFeatures.map(f => (
                    <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700 }}>
                      <Check size={14} style={{ color: 'var(--green)' }} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div style={{ marginTop: 30, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  onClick={() => handleCheckout('monthly')}
                  className="neo-btn"
                  style={{ width: '100%', padding: '10px', background: 'var(--amber)' }}
                  disabled={checkoutLoading !== null}
                >
                  {checkoutLoading === 'monthly' ? 'PROCESSING...' : 'GET PREMIUM (MONTHLY)'}
                </button>
                <button
                  onClick={() => handleCheckout('yearly')}
                  className="neo-btn"
                  style={{ width: '100%', padding: '10px', background: 'var(--indigo)', color: '#FFFFFF' }}
                  disabled={checkoutLoading !== null}
                >
                  {checkoutLoading === 'yearly' ? 'PROCESSING...' : 'GET PREMIUM (YEARLY)'}
                </button>
              </div>
            </div>

          </div>
        )}

        {/* Pricing Philosophy Cards */}
        <div style={{ marginTop: '5rem' }}>
          <h2 className="font-display" style={{ fontSize: 22, fontWeight: 900, textTransform: 'uppercase', textAlign: 'center', marginBottom: '2rem' }}>
            Why Go Premium?
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
            
            {/* Reason 1 */}
            <div className="neo-card" style={{ padding: '1.25rem', background: 'var(--bg-2)' }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>🧭</div>
              <h4 style={{ margin: '0 0 6px 0', fontSize: 14, fontWeight: 900, textTransform: 'uppercase' }}>Discover Better</h4>
              <p style={{ fontSize: 12, color: 'var(--text-2)', margin: 0, fontWeight: 700 }}>
                Focus only on listings that score &gt;50% matching with your specific tech stack and location preferences.
              </p>
            </div>

            {/* Reason 2 */}
            <div className="neo-card" style={{ padding: '1.25rem', background: 'var(--bg-2)' }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>⚡</div>
              <h4 style={{ margin: '0 0 6px 0', fontSize: 14, fontWeight: 900, textTransform: 'uppercase' }}>Save Hours Daily</h4>
              <p style={{ fontSize: 12, color: 'var(--text-2)', margin: 0, fontWeight: 700 }}>
                No more manual pagination across dozens of portals. Get the latest matching leads right in your inbox every morning.
              </p>
            </div>

            {/* Reason 3 */}
            <div className="neo-card" style={{ padding: '1.25rem', background: 'var(--bg-2)' }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>🛡️</div>
              <h4 style={{ margin: '0 0 6px 0', fontSize: 14, fontWeight: 900, textTransform: 'uppercase' }}>Never Miss Listings</h4>
              <p style={{ fontSize: 12, color: 'var(--text-2)', margin: 0, fontWeight: 700 }}>
                Get instant notifications on fresh aggregates before the standard applicant counts inflate.
              </p>
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}
