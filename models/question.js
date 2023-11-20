const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId, 
    paperName: String,
    question: [Object],
    subject: String,
    topic: [String],
    difficulty: {
        easy: String,
        medium: String,
        hard: String,
    },
    totalMarks: Number,
    createdBy: mongoose.Schema.Types.ObjectId,
}, { timestamps: true });

module.exports = mongoose.model("Question", questionSchema);
