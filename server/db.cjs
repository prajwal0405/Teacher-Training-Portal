const mongoose=require("mongoose");
const MONGO_URI=process.env.MONGO_URI||"mongodb://localhost:27017/teacher-training-portal";
mongoose.connect(MONGO_URI).then(()=>console.log("MongoDB connected")).catch(e=>console.error("MongoDB error:",e.message));
const teacherSchema=new mongoose.Schema({name:{type:String,required:true},email:{type:String,required:true,unique:true},phone:{type:String,default:""},address:{type:String,default:""},subject:{type:String,default:""},qualification:{type:String,default:""},experience:{type:String,default:""},photo:{type:String,default:""},password:{type:String,required:true},status:{type:String,enum:["pending","approved","rejected"],default:"pending"},joined:{type:String,default:""},attendance:{type:Number,default:0},classes:{type:Number,default:0},students:{type:Number,default:0},batch:{type:String,default:""},course:{type:String,default:""},revenue:{type:Number,default:0},createdAt:{type:Date,default:Date.now}});
const Teacher=mongoose.model("Teacher",teacherSchema);
const adminSchema=new mongoose.Schema({name:{type:String,required:true},email:{type:String,required:true,unique:true},password:{type:String,required:true},role:{type:String,default:"admin"}});
const Admin=mongoose.model("Admin",adminSchema);
module.exports={mongoose,Teacher,Admin};
