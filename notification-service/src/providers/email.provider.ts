import { NotificationProvider } from "../interface/notification.interface.js";
import { transporter } from "../config/email.config.js";

export class EmailProvider implements NotificationProvider{
    async send(to: string, message: string): Promise<void> {
        try {
    console.log("EMAIL_USER:", process.env.EMAIL_USER);
    console.log("EMAIL_PASS exists:", !!process.env.EMAIL_PASS);

    await transporter.verify();
    console.log("Transport verified");

    await transporter.sendMail({
      from: `"Anonymous Messaging" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: "Verify Your Email",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Email Verification</h2>
          <p>Your OTP is:</p>
          <h1>${message}</h1>
          <p>This OTP expires in 1 hour.</p>
        </div>
      `,
    });
   console.log('Email sent successfully')
    
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
        
    }
}