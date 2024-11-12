const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const port = process.env.port || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

// middleware
app.use(
   cors({
      origin: [
         "http://localhost:5173",
         "https://xpsc-86074.web.app",
         "https://xpsc-86074.firebaseapp.com"
      ]
   })
);
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zahfpvj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
   serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
   }
});

async function run() {
   try {
      // Connect the client to the server	(optional starting in v4.7)
      // await client.connect();

      const clubUserCollection = client.db("xpscDB").collection("clubUsers");
      const allUserCollection = client.db("xpscDB").collection("allUsers");
      const codeforcesContestListCollection = client.db("xpscDB").collection("codeforcesContestList");
      const codeforcesContestResultsCollection = client.db("xpscDB").collection("codeforcesContestResults");


      // auth related api
      app.post('/jwt', async (req, res) => {
         const user = req.body;
         const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
         res.send({ token });
      })


      // middlewares
      const verifyToken = (req, res, next) => {
         if (!req.headers.authorization) {
            return res.status(401).send({ message: 'unauthorized access' });
         }
         const token = req.headers.authorization.split(' ')[1];
         jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
            if (err) {
               return res.status(401).send({ message: 'unauthorized access' });
            }
            req.decoded = decoded;
            next();
         })
      }

      const verifyAdmin = async (req, res, next) => {
         const email = req.decoded.email;
         const query = { email: email };
         const user = await allUserCollection.findOne(query);
         const isAdmin = user?.role === 'admin';
         if (!isAdmin) {
            return res.status(403).send({ message: 'fobidden access' });
         }
         next();
      }


      // all users related api
      app.get('/allUsers', verifyToken, verifyAdmin, async (req, res) => {
         const result = await allUserCollection.find().toArray();
         res.send(result);
      })

      app.get('/allUsers/admin/:email', async (req, res) => {
         const email = req.params.email;
         const query = { email: email };
         const user = await allUserCollection.findOne(query);
         let admin = false;
         if (user) {
            admin = user?.role === 'admin';
         }
         res.send({ admin });
      })

      app.get('/allUsers/:email', async (req, res) => {
         const currentUserEmail = req.params.email;
         const query = { email: currentUserEmail };
         const result = await allUserCollection.findOne(query);
         res.send(result);
      })

      app.post('/allUsers', async (req, res) => {
         const user = req.body;
         const result = await allUserCollection.insertOne(user);
         res.send(result);
      })

      app.patch('/allUsers/:id', verifyToken, verifyAdmin, async (req, res) => {
         const updatedUserInfo = req.body;
         const id = req.params.id;
         const filter = { _id: new ObjectId(id) };
         const updatedUser = {
            $set: {
               name: updatedUserInfo.name,
               email: updatedUserInfo.email,
               role: updatedUserInfo.role
            }
         }
         const result = await allUserCollection.updateOne(filter, updatedUser);
         res.send(result);
      })

      app.delete('/allUsers/:id', verifyToken, verifyAdmin, async (req, res) => {
         const id = req.params.id;
         const query = { _id: new ObjectId(id) };
         const result = await allUserCollection.deleteOne(query);
         return res.send(result);
      })


      // club users related api
      app.get('/clubUsers', verifyToken, verifyAdmin, async (req, res) => {
         const result = await clubUserCollection.find().toArray();
         res.send(result);
      })

      app.get('/clubUsers/:id', async (req, res) => {
         const id = req.params.id;
         const query = { _id: new ObjectId(id) };
         const result = await clubUserCollection.findOne(query);
         res.send(result);
      })

      app.post('/clubUsers', verifyToken, verifyAdmin, async (req, res) => {
         const clubUser = req.body;
         const result = await clubUserCollection.insertOne(clubUser);
         res.send(result);
      })

      app.patch('/clubUsers/:id', verifyToken, verifyAdmin, async (req, res) => {
         const clubUser = req.body;
         const id = req.params.id;
         const filter = { _id: new ObjectId(id) };
         const updatedClubUser = {
            $set: {
               name: clubUser.name,
               email: clubUser.email,
               mobileNumber: clubUser.mobileNumber,
               discordUsername: clubUser.discordUsername,
               codeforcesHandle: clubUser.codeforcesHandle,
               codeforcesCurrentRating: clubUser.codeforcesCurrentRating,
               codeforcesMaxRating: clubUser.codeforcesMaxRating,
               image: clubUser.image
            }
         }
         const result = await clubUserCollection.updateOne(filter, updatedClubUser);
         res.send(result);
      })

      app.delete('/clubUsers/:id', verifyToken, verifyAdmin, async (req, res) => {
         const id = req.params.id;
         const query = { _id: new ObjectId(id) };
         const result = await clubUserCollection.deleteOne(query);
         return res.send(result);
      })


      // leaderboard related api
      app.get('/leaderboard', verifyToken, async (req, res) => {
         const page = parseInt(req.query.page);
         const size = parseInt(req.query.size);
         const result = await clubUserCollection
            .find()
            .skip(page * size)
            .limit(size)
            .sort({ codeforcesMaxRating: -1 })
            .toArray();
         res.send(result);
      })

      app.get('/clubUsersCount', async (req, res) => {
         const result = await clubUserCollection.countDocuments({});
         res.send({ result });
      })


      // codeforces contest list related api
      app.get('/codeforcesContestList', async (req, res) => {
         const result = await codeforcesContestListCollection.find().toArray();
         res.send(result);
      })

      app.get('/codeforcesContstList/:id', async (req, res) => {
         const id = req.params.id
         const query = { _id: new ObjectId(id) };
         const result = await codeforcesContestListCollection.findOne(query);
         res.send(result);
      })

      app.get('/codeforcesSingleContestName', async (req, res) => {
         const contestId = parseInt(req.query.contestId);
         const query = { contestId: contestId };
         const result = await codeforcesContestListCollection.findOne(query);
         res.send(result);
      })

      app.post('/codeforcesContestList', verifyToken, verifyAdmin, async (req, res) => {
         const contest = req.body
         const result = await codeforcesContestListCollection.insertOne(contest);
         res.send(result);
      })

      app.patch('/codeforcesContestList/:id', verifyToken, verifyAdmin, async (req, res) => {
         const contest = req.body;
         const id = req.params.id;
         const filter = { _id: new ObjectId(id) };
         const updatedContest = {
            $set: {
               contestId: contest.contestId,
               contestName: contest.contestName,
               contestDate: contest.contestDate,
               contestStartTime: contest.contestStartTime,
               contestEndTime: contest.contestEndTime,
               contestDuration: contest.contestDuration
            }
         }
         const result = await codeforcesContestListCollection.updateOne(filter, updatedContest);
         res.send(result);
      })

      app.delete('/codeforcesContestList/:id', verifyToken, verifyAdmin, async (req, res) => {
         const id = req.params.id;
         const query = { _id: new ObjectId(id) };
         const result = await codeforcesContestListCollection.deleteOne(query);
         res.send(result);
      })


      // codeforces contests participants results related api
      app.get('/codeforcesContestParticipantsResultsCountByContestId/:contestId', async (req, res) => {
         const contestId = req.params.contestId
         const query = { contestId: parseInt(contestId), participate: 1 };
         const result = await codeforcesContestResultsCollection.countDocuments(query);
         res.send({ result });
      })

      app.get('/codeforcesContestParticipantsResultsByContestId', verifyToken, async (req, res) => {
         const contestId = parseInt(req.query.contestId);
         const page = parseInt(req.query.page);
         const size = parseInt(req.query.size);
         const query = { contestId: contestId, participate: 1 };
         const options = {
            sort: {
               globalStandings: 1
            }
         }

         const result = await codeforcesContestResultsCollection.find(query, options)
            .skip(page * size)
            .limit(size)
            .toArray();
         res.send(result);
      })


      // codeforces contests non participants results related api
      app.get('/codeforcesContestNonParticipantsResultsCountByContestId/:contestId', async (req, res) => {
         const contestId = req.params.contestId
         const query = { contestId: parseInt(contestId), participate: 0 };
         const result = await codeforcesContestResultsCollection.countDocuments(query);
         res.send({ result });
      })

      app.get('/codeforcesContestNonParticipantsResultsByContestId', verifyToken, async (req, res) => {
         const contestId = parseInt(req.query.contestId);
         const page = parseInt(req.query.page);
         const size = parseInt(req.query.size);
         const query = { contestId: contestId, participate: 0 };
         const options = {
            sort: {
               globalStandings: 1
            }
         }

         const result = await codeforcesContestResultsCollection.find(query, options)
            .skip(page * size)
            .limit(size)
            .toArray();
         res.send(result);
      })


      // codeforces contest participant and non-participants user data related api
      app.get('/codeforcesContestAllUserResultCountByContestId/:contestId', verifyToken, verifyAdmin, async (req, res) => {
         const contestId = req.params.contestId;
         const query = { contestId: parseInt(contestId) };
         const result = await codeforcesContestResultsCollection.countDocuments(query);
         res.send({ result });

      })

      app.get('/codeforcesContestIndividualUserResult', verifyToken, verifyAdmin, async (req, res) => {
         const contestId = parseInt(req.query.contestId);
         const userCodeforcesHandle = req.query.codeforcesHandle;
         const query = { contestId: contestId, userName: userCodeforcesHandle };
         const result = await codeforcesContestResultsCollection.findOne(query);
         res.send(result);
      })

      app.post('/codeforcesContestIndividualUserResult', verifyToken, verifyAdmin, async (req, res) => {
         const individualUserResult = req.body;
         const result = await codeforcesContestResultsCollection.insertOne(individualUserResult);
         res.send(result);
      })

      app.delete('/codeforcesContestAllUserResult/:contestId', verifyToken, verifyAdmin, async (req, res) => {
         const contestId = req.params.contestId;
         const query = { contestId: parseInt(contestId) };
         const result = await codeforcesContestResultsCollection.deleteMany(query);
         res.send(result);
      })

      app.delete('/codeforcesContestIndividualUserResult/:codeforcesHandle', verifyToken, verifyAdmin, async (req, res) => {
         const codeforcesHandle = req.params.codeforcesHandle;
         const query = { userName: codeforcesHandle };
         const result = await codeforcesContestResultsCollection.deleteMany(query);
         res.send(result);
      })


      // Send a ping to confirm a successful connection
      // await client.db("admin").command({ ping: 1 });
      console.log("Pinged your deployment. You successfully connected to MongoDB!");
   } finally {
      // Ensures that the client will close when you finish/error
      // await client.close();
   }
}
run().catch(console.dir);


app.get('/', (req, res) => {
   res.send('XPSC server is running');
})

app.listen(port, () => {
   console.log(`XPSC server is running on port ${port}`);
})