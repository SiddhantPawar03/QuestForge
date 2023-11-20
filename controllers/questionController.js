const questionModel = require('../models/question');
const mongoose = require('mongoose');

const createQuestion = async (req, res) => {
    const {
        paperName,
        questionArray,
        topicsArray,
        difficulty,
        totalMarks,
        userId
    } = req.body;

    const newQuestion = new questionModel({
        _id: new mongoose.Types.ObjectId(),
        paperName,
        question: questionArray,
        subject: questionArray.length > 0 ? questionArray[0].subject : null,
        topic: topicsArray,
        difficulty: {
            easy: difficulty.easy,
            medium: difficulty.medium,
            hard: difficulty.hard,
        },
        totalMarks,
        createdBy: userId,
    });

    try {
        await newQuestion.save();
        return res.status(201).json({ message: 'Question created successfully' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

module.exports = {
    createQuestion,
};
