const express = require('express');
const bodyParser = require('body-parser');
const ejsMate = require('ejs-mate')
const path = require('path')
const _ = require('lodash');
const mongoose = require('mongoose');
const session = require('express-session')
const { forEach } = require('lodash');
const flash = require('connect-flash')
const MongoStore = require('connect-mongo');
const cookieParser = require('cookie-parser');
const userController = require('./controllers/userController');
const { MongoClient } = require('mongodb');
const questionController = require('./controllers/questionController');
const questionModel = require('../question-paper-generator/models/question');
const { auth, isLogedIn } = require('./middlewares/auth');
const dbUrl = process.env.MONGODB_URL || 'mongodb://localhost:27017/reeloDB'
const secret = process.env.SECRET_KEY || "EDI@50";
require('dotenv').config();

const app = express();

const store = MongoStore.create({
  mongoUrl: dbUrl,
  secret,
  touchAfter: 24 * 60 * 60
})
store.on('error', e => {
  console.log('Session Error!!!', e)
})

app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('views', './views');
app.set('view engine', 'ejs');

const sessionConfig = {
  store,
  name: 'QuestForge',
  secret,
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,  //just a extra layer of security to avoid client site req / cross-plaform req
    // secure: true,        //how extra security (sends no cookies for local host as well)
    expires: Date.now() + (1000 * 60 * 60 * 24 * 7),     //expires after 1 week of creation
    maxAge: (1000 * 60 * 60 * 24 * 7)
  }
}
app.use(session(sessionConfig))
app.use(flash())
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("public"));
app.use(express.json());
app.use(cookieParser());
app.use((req, res, next) => {
  next();
});

mongoose.connect(dbUrl, { useNewUrlParser: true })
  .then(data => console.log("Database connected"))
  .catch(err => console.log("Database connection failed"));

const client = new MongoClient(dbUrl, { useNewUrlParser: true, useUnifiedTopology: true });

//middleware for flashing all msg
app.use((req, res, next) => {
  res.locals.currentUser = isLogedIn(req)
  res.locals.success = req.flash('success')       //this will send success to all the rendering requests
  res.locals.warning = req.flash('warning')
  res.locals.error = req.flash('error')
  next()
})


app.get("/", function (req, res) {
  res.render("home");
});

app.get("/login", function (req, res) {
  res.render("login");
});

app.post("/signup", userController.signup);

app.get("/signup", function (req, res) {
  res.render("signup");
});

app.post("/login", userController.login);
app.get("/logout", userController.logout);

app.get("/question", auth, function (req, res) {
  res.render("topic");
});

app.get('/subject', auth, async (req, res) => {
  res.render(`subject`);
});

async function topics(subject) {
  try {
    await client.connect();
    const database = client.db('test');

    const topicResult = await database.collection('questionBank').aggregate([
      { $match: { "subject": { $regex: new RegExp("^" + subject, "i") } } },
      { $group: { _id: "$topic" } }
    ]).toArray();


    return topicResult;
  } finally {
    await client.close();
  }
}

app.get("/topic", auth, async function (req, res) {
  try {
    let subject = req.query.subject;
    subject = subject[0].toUpperCase() + subject.slice(1);
    let topicResults = await topics(subject);
    let distinctTopics = topicResults.map(item => item._id);
    res.render("topic", { distinctTopics, subject });
  } catch (error) {
    console.error('Error fetching topics:', error);
    res.status(500).send('Internal Server Error');
  }
});


async function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}


async function generateQuestionPaper(totalMarks, difficultyDistribution, questions) {
  // Filter questions based on marks
  const easyQuestions = questions.filter(question => question.marks === 1);
  const mediumQuestions = questions.filter(question => question.marks === 4);
  const hardQuestions = questions.filter(question => question.marks === 6);

  // Calculate the number of questions for each difficulty level
  const easyCount = Math.round((totalMarks * (difficultyDistribution.easy / 100)) / 3);
  const mediumCount = Math.round((totalMarks * (difficultyDistribution.medium / 100)) / 5);
  const hardCount = Math.round((totalMarks * (difficultyDistribution.hard / 100)) / 7);

  // Shuffle the filtered questions array to randomize question selection
  const shuffledEasyQuestions = await shuffleArray(easyQuestions);
  const shuffledMediumQuestions = await shuffleArray(mediumQuestions);
  const shuffledHardQuestions = await shuffleArray(hardQuestions);

  // Select questions based on the calculated counts for each difficulty level
  const questionPaper = shuffledEasyQuestions.slice(0, easyCount)
    .concat(shuffledMediumQuestions.slice(0, mediumCount))
    .concat(shuffledHardQuestions.slice(0, hardCount));

  return questionPaper;
}


async function runQuery(topicsArray, subject, difficulty, totalMarks) {
  try {
    await client.connect();
    const database = client.db('test');
    const aggregationResult = await database.collection('questionBank').aggregate([
      { $match: { "subject": subject, "topic": { $in: topicsArray } } }
    ]).toArray();

    const difficultyDistribution = {
      easy: difficulty.easy,
      medium: difficulty.medium,
      hard: difficulty.hard
    };

    const questionPaper = await generateQuestionPaper(totalMarks, difficultyDistribution, aggregationResult);
    return questionPaper;
  } finally {
    await client.close();
  }
}



app.get('/paper', auth, async (req, res) => {
  try {
    let topicsArray = toArray(req.query.topics);
    let subject = req.query.subject;
    let totalMarks = req.query.totalMarks;
    let difficulty = {
      easy: req.query.easy,
      medium: req.query.medium,
      hard: req.query.hard
    }
    let paperName = req.query.paperName;
    let userId = req.userId;

    const questionArray = await runQuery(topicsArray, subject, difficulty, totalMarks);
    res.render('paper', { questionArray, topicsArray, difficulty, totalMarks, paperName, userId });
  } catch (error) {
    console.error('Error in /paper route:', error);
    res.status(500).send('Internal Server Error');
  }
});


app.post('/save', async (req, res) => {
  try {
    await questionController.createQuestion(req, res);
  } catch (error) {
    console.error('Error in /save route:', error);
    res.status(500).send('Internal Server Error');
  }
});


async function getQuestionsByUserId(userId) {
  try {
    const questions = await questionModel.find({ createdBy: userId });
    return questions;
  } catch (err) {
    console.error(err);
    throw err;
  }
}

app.get('/getlist', auth, async (req, res) => {
  let userId = req.userId;
  try {
    const details = await getQuestionsByUserId(userId);
    res.render('list', { papers: details });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});


function toArray(value) {
  if (Array.isArray(value)) {
    return value;
  } else if (value) {
    return [value];
  } else {
    return [];
  }
}



app.listen(process.env.PORT || 3000, function () {
  console.log("Server listening on Port 3000!");
});
