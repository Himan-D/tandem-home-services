let _unsubscribeUrl = '';

function setUnsubscribeUrl(url) {
  _unsubscribeUrl = url;
}

function baseHtml(bodyContent) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{margin:0;padding:0;background-color:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
  .container{max-width:600px;margin:0 auto;padding:24px 16px}
  .card{background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)}
  .header{background:#05ac5f;padding:24px;text-align:center}
  .header h1{margin:0;color:#fff;font-size:20px;font-weight:600}
  .body{padding:24px}
  .body p{margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6}
  .footer{background:#f9fafb;padding:16px 24px;text-align:center;font-size:12px;color:#9ca3af}
  .footer a{color:#05ac5f;text-decoration:none}
  .btn{display:inline-block;padding:12px 24px;background:#05ac5f;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px}
  .badge{display:inline-block;padding:4px 12px;border-radius:999px;font-size:13px;font-weight:600}
  .badge-green{background:#d1fae5;color:#065f46}
  .badge-red{background:#fee2e2;color:#991b1b}
  .badge-blue{background:#dbeafe;color:#1e40af}
  .divider{border:none;border-top:1px solid #e5e7eb;margin:16px 0}
  .detail-row{display:flex;justify-content:space-between;padding:8px 0;font-size:14px}
  .detail-label{color:#6b7280}
  .detail-value{color:#111827;font-weight:500}
  .logo{font-size:24px;font-weight:700;color:#fff;letter-spacing:-.5px}
</style>
</head>
<body>
<div class="container">
<div class="card">
<div class="header"><div class="logo">Tandem</div></div>
<div class="body">
${bodyContent}
</div>
<div class="footer">
  <p style="margin:0 0 4px">Tandem Home Services — making home care effortless</p>
  <p style="margin:0">${_unsubscribeUrl ? `<a href="${_unsubscribeUrl}">Unsubscribe</a> &bull; ` : ''}<a href="${process.env.CORS_ORIGIN?.split(',')[0] || 'http://localhost:5173'}/account">Manage notifications</a> &bull; <a href="mailto:support@tandem.app">Contact support</a></p>
</div>
</div>
</div>
</body>
</html>`;
}

function welcome(name) {
  return baseHtml(`
    <h2 style="margin:0 0 8px;font-size:18px;color:#111827">Welcome to Tandem, ${name}!</h2>
    <p>We're thrilled to have you on board. Tandem connects you with trusted professionals for all your home service needs — from cleaning and plumbing to electrical work and more.</p>
    <p>Getting started is easy:</p>
    <ul style="color:#374151;font-size:15px;line-height:1.8;padding-left:20px">
      <li>Browse services near you</li>
      <li>Book trusted professionals in seconds</li>
      <li>Track your service in real-time</li>
      <li>Pay securely through the app</li>
    </ul>
    <div style="text-align:center;margin:24px 0">
      <a href="${process.env.CORS_ORIGIN?.split(',')[0] || 'http://localhost:5173'}/dashboard" class="btn">Get Started</a>
    </div>
  `);
}

function verification(name, code) {
  return baseHtml(`
    <h2 style="margin:0 0 8px;font-size:18px;color:#111827">Your verification code</h2>
    <p>Hi ${name}, use the code below to complete your login. It expires in 15 minutes.</p>
    <div style="text-align:center;margin:24px 0">
      <span style="display:inline-block;padding:16px 32px;background:#f3f4f6;border-radius:12px;font-size:32px;font-weight:700;letter-spacing:8px;color:#111827;font-family:monospace">${code}</span>
    </div>
    <p style="font-size:13px;color:#9ca3af">If you didn't request this code, you can safely ignore this email.</p>
  `);
}

function passwordReset(name, code) {
  return baseHtml(`
    <h2 style="margin:0 0 8px;font-size:18px;color:#111827">Reset your password</h2>
    <p>Hi ${name}, we received a request to reset your password. Use the code below:</p>
    <div style="text-align:center;margin:24px 0">
      <span style="display:inline-block;padding:16px 32px;background:#f3f4f6;border-radius:12px;font-size:32px;font-weight:700;letter-spacing:8px;color:#111827;font-family:monospace">${code}</span>
    </div>
    <p>If you didn't request this, please ignore this email. Your password will stay the same.</p>
  `);
}

function passwordChanged(name) {
  return baseHtml(`
    <h2 style="margin:0 0 8px;font-size:18px;color:#111827">Password changed successfully</h2>
    <p>Hi ${name}, your Tandem account password was just changed.</p>
    <p>If you made this change, no further action is needed. If you didn't, please <a href="${process.env.CORS_ORIGIN?.split(',')[0] || 'http://localhost:5173'}/forgot-password" style="color:#05ac5f">reset your password</a> immediately and contact support.</p>
  `);
}

function bookingConfirmed(name, details) {
  return baseHtml(`
    <h2 style="margin:0 0 8px;font-size:18px;color:#111827">Booking confirmed!</h2>
    <p>Hi ${name}, your service request has been received. Here's a summary:</p>
    <hr class="divider">
    <div class="detail-row"><span class="detail-label">Service</span><span class="detail-value">${details.title}</span></div>
    ${details.time ? `<div class="detail-row"><span class="detail-label">Time</span><span class="detail-value">${details.time}</span></div>` : ''}
    ${details.amount ? `<div class="detail-row"><span class="detail-label">Amount</span><span class="detail-value">$${details.amount}</span></div>` : ''}
    <hr class="divider">
    <p>We'll notify you as soon as a pro accepts your booking. You can track everything in real-time.</p>
    <div style="text-align:center;margin:24px 0">
      <a href="${process.env.CORS_ORIGIN?.split(',')[0] || 'http://localhost:5173'}/booking-status/${details.bookingId}" class="btn">Track Booking</a>
    </div>
  `);
}

function bookingCancelled(name, details) {
  return baseHtml(`
    <h2 style="margin:0 0 8px;font-size:18px;color:#111827">Booking cancelled</h2>
    <p>Hi ${name}, your booking has been cancelled.</p>
    <hr class="divider">
    <div class="detail-row"><span class="detail-label">Service</span><span class="detail-value">${details.title}</span></div>
    ${details.reason ? `<div class="detail-row"><span class="detail-label">Reason</span><span class="detail-value">${details.reason}</span></div>` : ''}
    ${details.refund ? `<div class="detail-row"><span class="detail-label">Refund</span><span class="detail-value">$${details.refund}</span></div>` : ''}
    <hr class="divider">
    <p>If you have questions, our support team is here to help.</p>
  `);
}

function newRating(name, details) {
  return baseHtml(`
    <h2 style="margin:0 0 8px;font-size:18px;color:#111827">New rating received!</h2>
    <p>Hi ${name}, you received a new rating on your recent job.</p>
    <div style="text-align:center;margin:24px 0">
      <span class="badge badge-blue" style="font-size:18px">${'★'.repeat(details.rating)}${'☆'.repeat(5 - details.rating)} ${details.rating}/5</span>
    </div>
    <p>Keep up the great work! Your ratings help build trust with the Tandem community.</p>
  `);
}

function newComplaint(name, details) {
  return baseHtml(`
    <h2 style="margin:0 0 8px;font-size:18px;color:#111827">New complaint report</h2>
    <p>An admin action is needed:</p>
    <hr class="divider">
    <div class="detail-row"><span class="detail-label">Booking ID</span><span class="detail-value">${details.bookingId}</span></div>
    <div class="detail-row"><span class="detail-label">Reason</span><span class="detail-value">${details.reason}</span></div>
    <hr class="divider">
    <p>Please review this in the admin dashboard at your earliest convenience.</p>
  `);
}

function onboardingComplete(name) {
  return baseHtml(`
    <h2 style="margin:0 0 8px;font-size:18px;color:#111827">Onboarding complete!</h2>
    <p>Congratulations ${name}, your partner onboarding is complete!</p>
    <div style="text-align:center;margin:24px 0">
      <span class="badge badge-green" style="font-size:16px;padding:8px 20px">Welcome bonus: $100 credited</span>
    </div>
    <p>A $100 welcome bonus has been credited to your wallet. You're now ready to start accepting jobs and earning on Tandem.</p>
    <div style="text-align:center;margin:24px 0">
      <a href="${process.env.CORS_ORIGIN?.split(',')[0] || 'http://localhost:5173'}/partner" class="btn">Go to Dashboard</a>
    </div>
  `);
}

function jobAccepted(name, details) {
  return baseHtml(`
    <h2 style="margin:0 0 8px;font-size:18px;color:#111827">Job accepted!</h2>
    <p>Hi ${name}, ${details.partnerName} has accepted your ${details.serviceTitle} request.</p>
    <p>They'll be on their way shortly. You can track their location in real-time from the booking page.</p>
    <div style="text-align:center;margin:24px 0">
      <a href="${process.env.CORS_ORIGIN?.split(',')[0] || 'http://localhost:5173'}/booking-status/${details.bookingId}" class="btn">Track Live</a>
    </div>
  `);
}

function jobCompleted(name, details) {
  return baseHtml(`
    <h2 style="margin:0 0 8px;font-size:18px;color:#111827">Service complete!</h2>
    <p>Hi ${name}, your ${details.serviceTitle} is complete!</p>
    <p>We'd love to hear about your experience. Your feedback helps us maintain quality and helps other customers make informed decisions.</p>
    <div style="text-align:center;margin:24px 0">
      <a href="${process.env.CORS_ORIGIN?.split(',')[0] || 'http://localhost:5173'}/booking-status/${details.bookingId}" class="btn">Rate Your Experience</a>
    </div>
  `);
}

function partnerApproval(name, status, note) {
  const statusBadge = status === 'approved'
    ? '<span class="badge badge-green">Approved</span>'
    : '<span class="badge badge-red">Rejected</span>';
  return baseHtml(`
    <h2 style="margin:0 0 8px;font-size:18px;color:#111827">Partner application ${status}</h2>
    <p>Hi ${name}, your application to become a Tandem partner has been <strong>${status}</strong>.</p>
    ${status === 'approved' ? `
      <p>Welcome to the team! You can now log in to your partner dashboard to set your availability, update your services, and start earning.</p>
      <div style="text-align:center;margin:24px 0">
        <a href="${process.env.CORS_ORIGIN?.split(',')[0] || 'http://localhost:5173'}/partner" class="btn">Go to Dashboard</a>
      </div>
    ` : `
      <p>Unfortunately, we're unable to approve your application at this time.</p>
    `}
    ${note ? `<p><strong>Note from admin:</strong> ${note}</p>` : ''}
  `);
}

function payoutNotification(name, details) {
  const statusBadge = details.status === 'completed'
    ? '<span class="badge badge-green">Completed</span>'
    : details.status === 'pending'
    ? '<span class="badge badge-blue">Pending</span>'
    : '<span class="badge badge-red">Rejected</span>';
  return baseHtml(`
    <h2 style="margin:0 0 8px;font-size:18px;color:#111827">Payout ${details.status}</h2>
    <p>Hi ${name}, here's an update on your payout:</p>
    <hr class="divider">
    <div class="detail-row"><span class="detail-label">Amount</span><span class="detail-value">$${details.amount}</span></div>
    <div class="detail-row"><span class="detail-label">Status</span><span class="detail-value">${statusBadge}</span></div>
    ${details.bookingId ? `<div class="detail-row"><span class="detail-label">Booking</span><span class="detail-value">#${details.bookingId}</span></div>` : ''}
    <hr class="divider">
    <p>Check your payout dashboard for details.</p>
  `);
}

function sosAlert(name, details) {
  return baseHtml(`
    <h2 style="margin:0 0 8px;font-size:18px;color:#991b1b">SOS alert — immediate attention needed</h2>
    <p>An emergency alert has been triggered by a user:</p>
    <hr class="divider">
    <div class="detail-row"><span class="detail-label">User</span><span class="detail-value">${name} (ID: ${details.userId})</span></div>
    ${details.bookingId ? `<div class="detail-row"><span class="detail-label">Booking</span><span class="detail-value">#${details.bookingId}</span></div>` : ''}
    ${details.location ? `<div class="detail-row"><span class="detail-label">Location</span><span class="detail-value">${details.location}</span></div>` : ''}
    <hr class="divider">
    <p style="color:#991b1b;font-weight:600">Please take immediate action in the admin dashboard.</p>
    <div style="text-align:center;margin:24px 0">
      <a href="${process.env.CORS_ORIGIN?.split(',')[0] || 'http://localhost:5173'}/admin" class="btn" style="background:#991b1b">Open Admin</a>
    </div>
  `);
}

function general(name, title, message) {
  return baseHtml(`
    <h2 style="margin:0 0 8px;font-size:18px;color:#111827">${title}</h2>
    <p>Hi ${name},</p>
    <p>${message}</p>
  `);
}

function render(title, message, userName) {
  const name = userName || 'there';

  if (title === 'Welcome to Lumina') return welcome(name);
  if (title === 'Your Lumina Code' || title?.includes('Login code')) {
    const code = message?.match(/[A-Z0-9]{6,}/)?.[0] || message;
    return verification(name, code);
  }
  if (title === 'Password Reset' || title?.includes('Reset code')) {
    const code = message?.match(/[A-Z0-9]{6,}/)?.[0] || message;
    return passwordReset(name, code);
  }
  if (title === 'Password Changed') return passwordChanged(name);

  if (title === 'Booking Confirmed') {
    const bookingMatch = message?.match(/booking for (.+?) has/);
    const amountMatch = message?.match(/\$(\d+\.?\d*)/);
    return bookingConfirmed(name, { title: bookingMatch?.[1] || 'your service', amount: amountMatch?.[1], bookingId: '0' });
  }

  if (title === 'Booking Cancelled') {
    const refundMatch = message?.match(/\$(\d+\.?\d*)/);
    const reasonMatch = message?.match(/Reason: (.+)$/);
    const serviceMatch = message?.match(/Booking (.+?) cancelled/);
    return bookingCancelled(name, { title: serviceMatch?.[1] || 'your service', reason: reasonMatch?.[1], refund: refundMatch?.[1] });
  }

  if (title === 'New Rating') {
    const ratingMatch = message?.match(/(\d)-star/);
    return newRating(name, { rating: parseInt(ratingMatch?.[1] || '5') });
  }

  if (title === 'New Complaint') {
    const bookingMatch = message?.match(/Complaint for job (\d+)/);
    const reasonMatch = message?.match(/: (.+)$/);
    return newComplaint(name, { bookingId: bookingMatch?.[1], reason: reasonMatch?.[1] || message });
  }

  if (title === 'Onboarding Complete') return onboardingComplete(name);

  if (title === 'Job Accepted') {
    const pMatch = message?.match(/^(.+?) accepted/);
    const sMatch = message?.match(/your (.+?) request/);
    return jobAccepted(name, { partnerName: pMatch?.[1] || 'A pro', serviceTitle: sMatch?.[1] || 'service' });
  }

  if (title === 'Job Completed' || title === 'Service Complete!') {
    const sMatch = message?.match(/^(.+?) complete/);
    return jobCompleted(name, { serviceTitle: sMatch?.[1] || 'Your service' });
  }

  if (title?.startsWith('Application')) {
    const status = title?.includes('approved') ? 'approved' : 'rejected';
    return partnerApproval(name, status);
  }

  if (title === 'Payout Requested') {
    const amt = message?.match(/\$(\d+\.?\d*)/)?.[1] || '0';
    const bid = message?.match(/#(\d+)/)?.[1];
    return payoutNotification(name, { amount: amt, status: 'pending', bookingId: bid });
  }

  if (title?.startsWith('Payout')) {
    const status = message?.includes('completed') ? 'completed' : message?.includes('rejected') ? 'rejected' : 'pending';
    const amt = message?.match(/\$(\d+\.?\d*)/)?.[1] || '0';
    return payoutNotification(name, { amount: amt, status });
  }

  if (title === 'SOS Alert') return sosAlert(name, { userId: '', bookingId: '', location: '' });

  return general(name, title, message);
}

module.exports = { render, setUnsubscribeUrl };
