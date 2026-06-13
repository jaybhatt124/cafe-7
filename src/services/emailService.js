import emailjs from 'emailjs-com'

const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID
const otpTemplateId = import.meta.env.VITE_EMAILJS_OTP_TEMPLATE_ID
const approvalTemplateId = import.meta.env.VITE_EMAILJS_APPROVAL_TEMPLATE_ID
const rejectionTemplateId = import.meta.env.VITE_EMAILJS_REJECTION_TEMPLATE_ID
const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY

export const emailReady = Boolean(serviceId && otpTemplateId && publicKey)

const sendEmail = async (templateId, params) => {
  if (!serviceId || !templateId || !publicKey) {
    console.info('EmailJS is not configured yet. Email payload:', params)
    return { demo: true }
  }
  return emailjs.send(serviceId, templateId, params, publicKey)
}

export const sendOtpEmail = (params) => sendEmail(otpTemplateId, params)
export const sendApprovalEmail = (params) => sendEmail(approvalTemplateId, params)
export const sendRejectionEmail = (params) => sendEmail(rejectionTemplateId, params)
