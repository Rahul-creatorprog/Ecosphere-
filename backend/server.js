import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Welcome to the Ecosphere API!' });
});

app.get("/api/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Ecosphere API is running successfully!' });
});

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 
