const express = require('express');
const templates = require('../lib/email-templates');
const { authenticateToken, requireRole } = require('../middleware/auth');

const SAMPLE_DATA = {
  welcome: { title: 'Welcome to Lumina', message: 'Your account is ready.', userName: 'Jane' },
  verification: { title: 'Your Lumina Code', message: 'Login code: A1B2C3. Expires in 15 minutes.', userName: 'Jane' },
  'password-reset': { title: 'Password Reset', message: 'Reset code: X9Y8Z7', userName: 'Jane' },
  'password-changed': { title: 'Password Changed', message: 'Your password was successfully reset.', userName: 'Jane' },
  'booking-confirmed': { title: 'Booking Confirmed', message: 'Your booking for Deep Cleaning has been received.', userName: 'Jane' },
  'booking-cancelled': { title: 'Booking Cancelled', message: '$75 refunded to wallet. Reason: Changed my mind', userName: 'Jane' },
  'new-rating': { title: 'New Rating', message: 'You received a 5-star rating.', userName: 'Mike' },
  'new-complaint': { title: 'New Complaint', message: 'Complaint for job 42: Late arrival', userName: 'Admin' },
  'onboarding-complete': { title: 'Onboarding Complete', message: 'Welcome bonus: $100 credited to wallet.', userName: 'Mike' },
  'job-accepted': { title: 'Job Accepted', message: 'Sarah accepted your Deep Cleaning request.', userName: 'Jane' },
  'job-completed': { title: 'Job Completed', message: 'Deep Cleaning complete! Please rate.', userName: 'Jane' },
  'partner-approved': { title: 'Application Approved', message: 'Your partner application has been approved.', userName: 'Mike' },
  'partner-rejected': { title: 'Application Rejected', message: 'Your partner application has been rejected.', userName: 'Mike' },
  'payout-requested': { title: 'Payout Requested', message: 'Payout of $150 for booking #42 requested.', userName: 'Mike' },
  'payout-completed': { title: 'Payout Completed', message: 'Your payout of $150 is completed.', userName: 'Mike' },
  'payout-rejected': { title: 'Payout Rejected', message: 'Your payout of $150 is rejected.', userName: 'Mike' },
  sos: { title: 'SOS Alert', message: 'User #7 triggered an SOS. Booking: 42 Location: 37.77, -122.41', userName: 'Admin' },
  general: { title: 'General Notification', message: 'This is a sample general notification message.', userName: 'Jane' },
};

module.exports = function () {
  const router = express.Router();

  router.get('/email-preview/:type', authenticateToken, requireRole('admin'), (req, res) => {
    const type = req.params.type;
    const sample = SAMPLE_DATA[type];
    if (!sample) return res.status(404).send('Unknown template type. Available: ' + Object.keys(SAMPLE_DATA).join(', '));
    const html = templates.render(sample.title, sample.message, sample.userName);
    res.send(html);
  });

  router.get('/email-preview', authenticateToken, requireRole('admin'), (req, res) => {
    const list = Object.keys(SAMPLE_DATA).map(k => ({
      type: k,
      url: `/api/admin/email-preview/${k}`,
      ...SAMPLE_DATA[k],
    }));
    res.json(list);
  });

  return router;
};
