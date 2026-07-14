import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/spacece')
  .then(async () => {
    try {
      const Center = mongoose.model('Center', new mongoose.Schema({ name: String, mentor: mongoose.Schema.Types.ObjectId }));
      const User = mongoose.model('User', new mongoose.Schema({ role: String, mentorProfile: { center: mongoose.Schema.Types.ObjectId } }));

      // Find SPC Beed
      const spcBeed = await Center.findOne({ name: 'SPC Beed' });
      if (!spcBeed) {
         console.log('SPC Beed not found');
         process.exit(0);
      }
      const mentorId = spcBeed.mentor;
      if (!mentorId) {
         console.log('SPC Beed has no mentor assigned');
         process.exit(0);
      }

      console.log('Mentor ID:', mentorId);

      // Unset mentor from all other centers
      const result = await Center.updateMany({ mentor: mentorId, _id: { $ne: spcBeed._id } }, { $unset: { mentor: '' } });
      console.log('Unset mentor from ' + result.modifiedCount + ' other centers');

      // Update the user profile
      const userUpdate = await User.updateOne({ _id: mentorId }, { $set: { 'mentorProfile.center': spcBeed._id } });
      console.log('User profile updated:', userUpdate.modifiedCount);

    } catch (err) {
      console.error(err);
    }
    process.exit(0);
  });
