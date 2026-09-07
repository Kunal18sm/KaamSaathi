const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'orgtkkqn',
  api_key: process.env.CLOUDINARY_API_KEY || '159341194654863',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'bE7Em_3MiUB425XmuYmLzbwx8X4'
});

const uploadImage = async (fileBase64, folder = 'sevasetu_workers') => {
  try {
    const result = await cloudinary.uploader.upload(fileBase64, {
      folder,
      resource_type: 'auto'
    });
    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error.message);
    // Fallback to placeholder if cloud upload is unconfigured or network restricted
    return 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?auto=format&fit=crop&q=80&w=200';
  }
};

module.exports = {
  cloudinary,
  uploadImage
};
