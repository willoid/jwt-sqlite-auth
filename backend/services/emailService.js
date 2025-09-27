// backend/services/emailService.js
const sgMail = require('@sendgrid/mail');

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

class EmailService {
    constructor() {
        this.from = {
            email: process.env.SENDGRID_FROM_EMAIL || 'willoid.webdev@gmail.com',
            name: process.env.SENDGRID_FROM_NAME || 'Willy'
        };

        // Track sent emails for rate limiting
        this.sentEmails = new Map();
    }

    /**
     * Send verification email with professional template
     */
    async sendVerificationEmail(email, username, token) {
        const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

        const msg = {
            to: email,
            from: this.from,
            subject: 'Verify Your Email Address - Action Required',
            text: `Hi ${username}, Please verify your email by clicking: ${verificationUrl}`,
            html: this.getVerificationTemplate(username, verificationUrl),
            trackingSettings: {
                clickTracking: { enable: true },
                openTracking: { enable: true }
            }
        };

        try {
            const response = await sgMail.send(msg);
            console.log(`Verification email sent to ${email}`);

            // Track for rate limiting
            this.trackEmail(email, 'verification');

            return {
                success: true,
                messageId: response[0].headers['x-message-id']
            };
        } catch (error) {
            console.error('SendGrid error:', error);

            if (error.response) {
                console.error(error.response.body);
            }

            throw new Error('Failed to send verification email');
        }
    }

    /**
     * Send password reset email
     */
    async sendPasswordResetEmail(email, username, resetCode) {
        const msg = {
            to: email,
            from: this.from,
            subject: 'Password Reset Request',
            text: `Your password reset code is: ${resetCode}. This code expires in 15 minutes.`,
            html: this.getPasswordResetTemplate(username, resetCode),
            trackingSettings: {
                clickTracking: { enable: false },
                openTracking: { enable: true }
            }
        };

        try {
            const response = await sgMail.send(msg);
            console.log(`Password reset email sent to ${email}`);

            // Track for rate limiting
            this.trackEmail(email, 'password-reset');

            return {
                success: true,
                messageId: response[0].headers['x-message-id']
            };
        } catch (error) {
            console.error('SendGrid error:', error);
            throw new Error('Failed to send password reset email');
        }
    }

    /**
     * Send welcome email after successful verification
     */
    async sendWelcomeEmail(email, username) {
        const msg = {
            to: email,
            from: this.from,
            subject: `Welcome to ${process.env.SENDGRID_FROM_NAME}!`,
            text: `Hi ${username}, Welcome aboard! Your email has been verified.`,
            html: this.getWelcomeTemplate(username)
        };

        try {
            await sgMail.send(msg);
            console.log(`Welcome email sent to ${email}`);
            return { success: true };
        } catch (error) {
            console.error('Welcome email error:', error);
            // Don't throw - welcome email is not critical
            return { success: false };
        }
    }

    /**
     * Professional verification email template
     */
    getVerificationTemplate(username, verificationUrl) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Email Verification</title>
                <!--[if mso]>
                <noscript>
                    <xml>
                        <o:OfficeDocumentSettings>
                            <o:PixelsPerInch>96</o:PixelsPerInch>
                        </o:OfficeDocumentSettings>
                    </xml>
                </noscript>
                <![endif]-->
                <style>
                    /* Email Client Compatibility */
                    @media only screen and (max-width: 600px) {
                        .container { width: 100% !important; }
                        .content { padding: 20px !important; }
                    }
                </style>
            </head>
            <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
                <table role="presentation" style="width: 100%; border-collapse: collapse; border: 0; border-spacing: 0; background: #f5f5f5;">
                    <tr>
                        <td align="center" style="padding: 40px 0;">
                            <table class="container" role="presentation" style="width: 600px; border-collapse: collapse; border: 0; border-spacing: 0; text-align: left; background: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                <!-- Header -->
                                <tr>
                                    <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
                                        <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">
                                            Email Verification Required
                                        </h1>
                                    </td>
                                </tr>
                                
                                <!-- Body -->
                                <tr>
                                    <td class="content" style="padding: 40px 30px;">
                                        <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 24px; color: #333333;">
                                            Hi <strong>${username}</strong>,
                                        </p>
                                        
                                        <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 24px; color: #333333;">
                                            Welcome! You're just one step away from completing your registration. Please verify your email address to activate your account.
                                        </p>
                                        
                                        <!-- CTA Button -->
                                        <table role="presentation" style="border-collapse: collapse; border: 0; border-spacing: 0; margin: 30px auto;">
                                            <tr>
                                                <td style="border-radius: 6px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                                                    <a href="${verificationUrl}" target="_blank" style="display: inline-block; padding: 16px 36px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 6px;">
                                                        Verify Email Address
                                                    </a>
                                                </td>
                                            </tr>
                                        </table>
                                        
                                        <p style="margin: 20px 0; font-size: 14px; line-height: 20px; color: #666666; text-align: center;">
                                            Or copy and paste this link into your browser:
                                        </p>
                                        
                                        <p style="margin: 0 0 20px 0; padding: 12px; background: #f8f9fa; border-radius: 4px; font-size: 12px; word-break: break-all; color: #666666;">
                                            ${verificationUrl}
                                        </p>
                                        
                                        <!-- Warning -->
                                        <table role="presentation" style="width: 100%; border-collapse: collapse; border: 0; border-spacing: 0; margin-top: 30px;">
                                            <tr>
                                                <td style="padding: 15px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px;">
                                                    <p style="margin: 0; color: #856404; font-size: 14px;">
                                                        <strong>⚠️ Important:</strong> This link expires in 24 hours for security reasons.
                                                    </p>
                                                </td>
                                            </tr>
                                        </table>
                                        
                                        <p style="margin: 30px 0 0 0; font-size: 14px; line-height: 20px; color: #999999;">
                                            If you didn't create an account, you can safely ignore this email.
                                        </p>
                                    </td>
                                </tr>
                                
                                <!-- Footer -->
                                <tr>
                                    <td style="padding: 20px 30px; background: #f8f9fa; border-radius: 0 0 8px 8px;">
                                        <p style="margin: 0; font-size: 12px; line-height: 18px; color: #999999; text-align: center;">
                                            © ${new Date().getFullYear()} ${process.env.SENDGRID_FROM_NAME}. All rights reserved.
                                        </p>
                                        <p style="margin: 10px 0 0 0; font-size: 12px; line-height: 18px; color: #999999; text-align: center;">
                                            This is an automated message. Please do not reply to this email.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `;
    }

    /**
     * Password reset email template
     */
    getPasswordResetTemplate(username, resetCode) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
                <table role="presentation" style="width: 100%; border-collapse: collapse; border: 0; border-spacing: 0; background: #f5f5f5;">
                    <tr>
                        <td align="center" style="padding: 40px 0;">
                            <table role="presentation" style="width: 600px; border-collapse: collapse; border: 0; border-spacing: 0; text-align: left; background: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                <!-- Header -->
                                <tr>
                                    <td style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
                                        <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">
                                            Password Reset Request
                                        </h1>
                                    </td>
                                </tr>
                                
                                <!-- Body -->
                                <tr>
                                    <td style="padding: 40px 30px;">
                                        <p style="margin: 0 0 20px 0; font-size: 16px; color: #333;">
                                            Hi <strong>${username}</strong>,
                                        </p>
                                        
                                        <p style="margin: 0 0 30px 0; font-size: 16px; color: #333;">
                                            We received a request to reset your password. Use the code below to complete the process:
                                        </p>
                                        
                                        <!-- Reset Code -->
                                        <div style="background: #f8f9fa; border: 2px dashed #dee2e6; border-radius: 8px; padding: 30px; text-align: center; margin: 30px 0;">
                                            <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">
                                                Your reset code:
                                            </p>
                                            <p style="margin: 0; font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #333;">
                                                ${resetCode}
                                            </p>
                                            <p style="margin: 10px 0 0 0; font-size: 12px; color: #dc3545;">
                                                Expires in 15 minutes
                                            </p>
                                        </div>
                                        
                                        <p style="margin: 30px 0; font-size: 14px; color: #666;">
                                            If you didn't request this reset, please ignore this email. Your password won't be changed.
                                        </p>
                                        
                                        <!-- Security Notice -->
                                        <div style="background: #e7f3ff; border-left: 4px solid #0066cc; padding: 15px; margin-top: 30px;">
                                            <p style="margin: 0; font-size: 14px; color: #0066cc;">
                                                <strong>🔒 Security Tip:</strong> Never share this code with anyone. Our team will never ask for it.
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                                
                                <!-- Footer -->
                                <tr>
                                    <td style="padding: 20px 30px; background: #f8f9fa; border-radius: 0 0 8px 8px;">
                                        <p style="margin: 0; font-size: 12px; color: #999; text-align: center;">
                                            © ${new Date().getFullYear()} ${process.env.SENDGRID_FROM_NAME}. All rights reserved.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `;
    }

    /**
     * Welcome email template
     */
    getWelcomeTemplate(username) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5;">
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td align="center" style="padding: 40px 0;">
                            <table role="presentation" style="width: 600px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                <tr>
                                    <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
                                        <h1 style="color: white; margin: 0; font-size: 32px;">
                                            Welcome to ${process.env.SENDGRID_FROM_NAME}! 🎉
                                        </h1>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 40px 30px;">
                                        <p style="font-size: 18px; color: #333; margin: 0 0 20px;">
                                            Hi ${username},
                                        </p>
                                        <p style="font-size: 16px; color: #666; line-height: 24px;">
                                            Your email has been verified! You now have full access to all features.
                                        </p>
                                        
                                        <h2 style="color: #333; margin: 30px 0 20px;">What's Next?</h2>
                                        
                                        <ul style="color: #666; font-size: 16px; line-height: 28px;">
                                            <li>Complete your profile</li>
                                            <li>Explore our features</li>
                                            <li>Join the community</li>
                                            <li>Start your first project</li>
                                        </ul>
                                        
                                        <div style="text-align: center; margin: 40px 0;">
                                            <a href="${process.env.FRONTEND_URL}" style="display: inline-block; padding: 16px 36px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
                                                Go to Dashboard
                                            </a>
                                        </div>
                                        
                                        <p style="color: #999; font-size: 14px; text-align: center; margin-top: 40px;">
                                            Need help? Contact support@example.com
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `;
    }

    /**
     * Track emails for rate limiting
     */
    trackEmail(email, type) {
        const key = `${email}-${type}`;
        const now = Date.now();

        if (!this.sentEmails.has(key)) {
            this.sentEmails.set(key, []);
        }

        const timestamps = this.sentEmails.get(key);
        // Keep only last hour's emails
        const oneHourAgo = now - (60 * 60 * 1000);
        const recentEmails = timestamps.filter(t => t > oneHourAgo);
        recentEmails.push(now);

        this.sentEmails.set(key, recentEmails);
    }

    /**
     * Check if email can be sent (rate limiting)
     */
    canSendEmail(email, type, maxPerHour = 3) {
        const key = `${email}-${type}`;
        if (!this.sentEmails.has(key)) return true;

        const now = Date.now();
        const oneHourAgo = now - (60 * 60 * 1000);
        const timestamps = this.sentEmails.get(key);
        const recentCount = timestamps.filter(t => t > oneHourAgo).length;

        return recentCount < maxPerHour;
    }
}

// Create singleton instance
const emailService = new EmailService();

module.exports = emailService;