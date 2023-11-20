const questionModel = require('../models/question');
const mongoose = require('mongoose');


const createQuestion = async (req, res) => {
    const newQuestion = new questionModel({
        _id: new mongoose.Types.ObjectId(),
        paperName: req.body.paperName,
        question: req.body.questionArray,
        subject: req.body.questionArray[0].subject,
        topic: req.body.topicsArray,
        difficulty: {
            easy: req.body.difficulty.easy,
            medium: req.body.difficulty.medium,
            hard: req.body.difficulty.hard,
        },
        totalMarks: req.body.totalMarks,
        createdBy: req.body.userId,
    }, { timestamps: true });
    

    try {
        await newQuestion.save();
        return res.redirect('/');
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Something went wrong" });
    }
}

module.exports = {
    createQuestion,
};
