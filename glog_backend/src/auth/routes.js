const express = require('express');
const router = express.Router();
const authenticate = require('./middleware');
const {
  redirectToGithub,
  githubCallback,
  refreshAccessToken,
  logout,
  getMe,
  completeSetup,
  withdrawAccount,
} = require('./controller');
const { claimDailyReward } = require('./dailyReward');

router.get('/github', redirectToGithub);
router.get('/github/callback', githubCallback);
router.post('/refresh', refreshAccessToken);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);
router.post('/setup', authenticate, completeSetup);
router.post('/daily-reward', authenticate, claimDailyReward);
router.delete('/me', authenticate, withdrawAccount);

module.exports = router;
