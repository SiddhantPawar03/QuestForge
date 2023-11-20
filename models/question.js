const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    paperName: {
        type: String,
        required: true
    },
    question: {
        type: [Object], // You might want to specify a more specific schema for questions
        required: true
    },
    subject: {
        type: String,
        required: true
    },
    topic: {
        type: [String],
        required: true
    },
    difficulty: {
        easy: {
            type: String,
            required: true
        },
        medium: {
            type: String,
            required: true
        },
        hard: {
            type: String,
            required: true
        }
    },
    totalMarks: {
        type: Number,
        required: true,
        validate: {
            validator: function (value) {
                return value >= 0;
            },
            message: 'Total marks must be a non-negative number.'
        }
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    }
}, { timestamps: true });

const QuestionModel = mongoose.model('Question', questionSchema);

module.exports = QuestionModel;
