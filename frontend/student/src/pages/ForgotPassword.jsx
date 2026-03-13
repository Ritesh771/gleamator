import React, { useState } from 'react'
import { Link } from 'react-router-dom'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  function submit(e) {
    e.preventDefault()
    if (!email.trim()) return
    // TODO: call API to send reset code
    setSent(true)
  }

  return (
    <div className="reset-page">
      <div className="reset-left">
        <div className="reset-content">
          <div className="steps">
            <div className="step active">
              <div className="icon">✉️</div>
              <div className="label">Email<br/><span>Enter your email</span></div>
            </div>
            <div className="step">
              <div className="icon">🔒</div>
              <div className="label">Verification<br/><span>Enter OTP code</span></div>
            </div>
            <div className="step">
              <div className="icon">🔑</div>
              <div className="label">New Password<br/><span>Set new password</span></div>
            </div>
            <div className="step">
              <div className="icon">✅</div>
              <div className="label">Complete<br/><span>Password reset</span></div>
            </div>
          </div>

          <h2>Reset Password</h2>
          <p className="muted">Enter your email to receive a reset code</p>

          {!sent ? (
            <form onSubmit={submit} className="reset-form">
              <label className="field-label">Email Address</label>
              <input placeholder="Enter your email address" value={email} onChange={(e) => setEmail(e.target.value)} />
              <button type="submit" className="send-btn">Send Reset Code</button>
            </form>
          ) : (
            <div className="sent-confirm">
              <p>Reset code sent to <strong>{email}</strong>. Check your inbox.</p>
              <Link to="/login" className="forgot">← Back to Login</Link>
            </div>
          )}
        </div>
      </div>
      <div className="reset-right">
        <div className="right-copy">
          <h1>Secure Password Recovery</h1>
          <p className="muted">Reset your password securely in just a few steps</p>
          <div className="illustration-wrapper">
            <img src="/undraw_forgot-password_nttj.svg" alt="illustration" />
          </div>
          <div className="right-footer">
            <div>NEURO CAMPUS Security</div>
            <div className="muted">Secure password recovery system</div>
          </div>
        </div>
      </div>
    </div>
  )
}
