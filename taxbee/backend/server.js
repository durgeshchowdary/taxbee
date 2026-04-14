import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import mongoose from 'mongoose';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect('mongodb://project75:project75@ac-bnitttb-shard-00-00.zqa9cjr.mongodb.net:27017,ac-bnitttb-shard-00-01.zqa9cjr.mongodb.net:27017,ac-bnitttb-shard-00-02.zqa9cjr.mongodb.net:27017/taxbee?ssl=true&replicaSet=atlas-7g5gb7-shard-0&authSource=admin')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB connection error:', err));
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));