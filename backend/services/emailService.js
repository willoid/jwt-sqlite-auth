/**
 * Email Service - Simulated for Development
 * In production, replace with SendGrid, AWS SES, or Mailgun
 *
 * This simulates email sending and logs to console
 * The structure matches real email services for easy swapping
 */
class EmailService {
    constructor() {
        this.emailQueue = [];
        this.sentEmails = [];
    }
    /**
     * Generate verification email HTML
     * Professional template matching industry standards
     */
    generateVerificationEmail(username, verificationUrl) {
        return {
            subject: 'Verify Your Email - Action Required',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: #6366f1; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                        .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
                        .button { display: inline-block; padding: 14px 30px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                        .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
                        .warning { background: #fef2f2; border: 1px solid #fee2e2; padding: 15px; border-radius: 6px; color: #991b1b; margin-top: 20px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🔐 Email Verification Required</h1>
                        </div>
                        <div class="content">
                            <h2>Hi ${username},</h2>
                            <p>Welcome! You're almost ready to get started. Please verify your email address to activate your account.</p>
                            <div style="text-align: center;">
                                <a href="${verificationUrl}" class="button">Verify Email Address</a>
                            </div>
                            <p>Or copy and paste this link into your browser:</p>
                            <p style="background: #f3f4f6; padding: 10px; border-radius: 4px; word-break: break-all; font-size: 12px;">
                                ${verificationUrl}
                            </p>
                            <div class="warning">
                                <strong>⚠️ This link expires in 24 hours</strong><br>
                                If you didn't create an account, you can safely ignore this email.
                            </div>
                            <div class="footer">
                                <p>This is an automated message. Please do not reply to this email.</p>
                                <p>© 2024 Your Company. All rights reserved.</p>
                            </div>
                        </div>
                    </div>
                </body>
                </html>
            `,
            text: `Hi ${username}, Please verify your email by visiting: ${verificationUrl}. This link expires in 24 hours.`
        };
    }
    /**
     * Send verification email (simulated)
     * In production, this would call SendGrid/AWS SES API
     */
    async sendVerificationEmail(email, username, token) {
        const verificationUrl = `http://localhost:5173/verify-email?token=${token}`;
        const emailContent = this.generateVerificationEmail(username, verificationUrl);
        // Simulate email sending delay
        await new Promise(resolve => setTimeout(resolve, 100));
        // In production, this would be:
        // await sendgrid.send({
        //     to: email,
        //     from: 'noreply@yourcompany.com',
        //     subject: emailContent.subject,
        //     html: emailContent.html
        // });
        // For development, log to console
        console.log('\n' + '='.repeat(60));
        console.log('📧 EMAIL VERIFICATION SENT (SIMULATED)');
        console.log('='.repeat(60));
        console.log(`To: ${email}`);
        console.log(`Subject: ${emailContent.subject}`);
        console.log(`Verification URL: ${verificationUrl}`);
        console.log('='.repeat(60) + '\n');
        // Store for testing/debugging
        this.sentEmails.push({
            to: email,
            subject: emailContent.subject,
            verificationUrl,
            sentAt: new Date()
        });
        return {
            success: true,
            messageId: `sim_${Date.now()}`,
            verificationUrl // Return URL for demo purposes only
        };
    }
    /**
     * Get sent emails (for testing/debugging)
     */
    getSentEmails(email = null) {
        if (email) {
            return this.sentEmails.filter(e => e.to === email);
        }
        return this.sentEmails;
    }
}
// Create singleton instance
const emailService = new EmailService();
module.exports = emailService;