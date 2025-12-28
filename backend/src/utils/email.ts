import axios from 'axios';

const MAIL_SERVICE_URL = process.env.MAIL_SERVICE_URL || 'https://mailservice-tau.vercel.app/api/email/send';
const MAIL_SERVICE_API_KEY = process.env.MAIL_SERVICE_API_KEY || 'test-api-key-123';

export const sendEmail = async (options: {
  email: string;
  subject: string;
  message: string;
  html?: string;
}) => {
  try {
    const response = await axios.post(
      MAIL_SERVICE_URL,
      {
        to: options.email,
        subject: options.subject,
        html: options.html || `<p>${options.message}</p>`,
      },
      {
        headers: {
          'x-api-key': MAIL_SERVICE_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (error: any) {
    console.error('Error sending email through mail service:', error.response?.data || error.message);
    throw new Error('Could not send email');
  }
};

export const sendPasswordResetEmail = async (email: string, resetUrl: string) => {
  // Plain text version (fallback)
  const message = `You are receiving this email because you (or someone else) have requested the reset of a password. Please make a put request to: ${resetUrl}`;
  
  // Premium HTML Version
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
      <title>Reset Your Password</title>
      <style>
        @media only screen and (max-width: 620px) {
          table.body h1 { font-size: 28px !important; margin-bottom: 10px !important; }
          table.body p, table.body ul, table.body ol, table.body td, table.body span, table.body a { font-size: 16px !important; }
          table.body .wrapper, table.body .article { padding: 10px !important; }
          table.body .content { padding: 0 !important; }
          table.body .container { padding: 0 !important; width: 100% !important; }
          table.body .main { border-left-width: 0 !important; border-radius: 0 !important; border-right-width: 0 !important; }
          table.body .btn table { width: 100% !important; }
          table.body .btn a { width: 100% !important; }
        }
      </style>
    </head>
    <body style="background-color: #f4f4f7; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; font-size: 14px; line-height: 1.4; margin: 0; padding: 0; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" class="body" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%; background-color: #f4f4f7;">
        <tr>
          <td style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; vertical-align: top;">&nbsp;</td>
          <td class="container" style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; vertical-align: top; display: block; max-width: 580px; padding: 10px; width: 580px; margin: 0 auto;">
            
            <div class="header" style="padding: 20px 0; text-align: center;">
              <span style="font-size: 24px; font-weight: bold; color: #111111; letter-spacing: -1px;">Soora SG</span>
            </div>

            <div class="content" style="box-sizing: border-box; display: block; margin: 0 auto; max-width: 580px; padding: 10px;">

              <table role="presentation" class="main" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%; background: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); overflow: hidden;">

                <tr>
                  <td class="wrapper" style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; vertical-align: top; box-sizing: border-box; padding: 40px;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%;">
                      <tr>
                        <td style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; vertical-align: top;">
                          <h1 style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #111111; font-size: 24px; font-weight: 700; line-height: 1.2; margin: 0; margin-bottom: 20px; text-align: center;">Reset Your Password</h1>
                          <p style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 16px; font-weight: normal; margin: 0; margin-bottom: 15px; color: #4a5568; text-align: center;">
                            Hello, we received a request to reset the password for your Soora account.
                          </p>
                          <p style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 16px; font-weight: normal; margin: 0; margin-bottom: 30px; color: #4a5568; text-align: center;">
                            If you didn't make this request, you can safely ignore this email.
                          </p>
                          
                          <table role="presentation" border="0" cellpadding="0" cellspacing="0" class="btn btn-primary" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%; box-sizing: border-box;">
                            <tbody>
                              <tr>
                                <td align="center" style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; vertical-align: top; padding-bottom: 15px;">
                                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: auto;">
                                    <tbody>
                                      <tr>
                                        <td style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; vertical-align: top; background-color: #111111; border-radius: 5px; text-align: center;"> 
                                          <a href="${resetUrl}" target="_blank" style="display: inline-block; color: #ffffff; background-color: #111111; border: solid 1px #111111; border-radius: 5px; box-sizing: border-box; cursor: pointer; text-decoration: none; font-size: 16px; font-weight: bold; margin: 0; padding: 12px 25px; text-transform: capitalize;">Reset Password</a> 
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                          <p style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; font-weight: normal; margin: 0; margin-top: 20px; margin-bottom: 15px; color: #718096; text-align: center;">
                            This link will expire in 1 hour.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                </table>
              <div class="footer" style="clear: both; margin-top: 10px; text-align: center; width: 100%;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%;">
                  <tr>
                    <td class="content-block" style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; vertical-align: top; padding-bottom: 10px; padding-top: 10px; color: #999999; font-size: 12px; text-align: center;">
                      <span class="apple-link" style="color: #999999; font-size: 12px; text-align: center;">Soora SG - Premium Liquor Delivery</span>
                      <br> Singapore
                    </td>
                  </tr>
                </table>
              </div>
              </div>
          </td>
          <td style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; vertical-align: top;">&nbsp;</td>
        </tr>
      </table>
    </body>
    </html>
  `;

  await sendEmail({
    email,
    subject: 'Action Required: Reset Your Password',
    message,
    html,
  });
};