const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const app = express();
const PORT = 3000;
const postsFilePath = path.join(__dirname, 'posts.json');
const backupFilePath = path.join(__dirname, 'backup_posts.json');

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware to parse form data
app.use(bodyParser.urlencoded({ extended: true }));

// Session middleware setup
app.use(session({
    secret: 'your-session-secret',
    resave: false,
    saveUninitialized: true
}));

// Serve static files
app.use(express.static('public'));

// Function to create a backup of the posts file
async function backupPosts() {
    try {
        await fs.copyFile(postsFilePath, backupFilePath);
        console.log('Backup created successfully.');
    } catch (err) {
        console.error('Error creating backup:', err);
    }
}

// Route to serve the blog page with posts
app.get('/', async (req, res) => {
    try {
        const data = await fs.readFile(postsFilePath, 'utf8');
        let posts = JSON.parse(data);

        // Filter by tag if provided in query
        const tagFilter = req.query.tag;
        if (tagFilter) {
            posts = posts.filter(post => post.tags.some(tag => tag.toLowerCase() === tagFilter.toLowerCase()));
        }

        // Render page with login status
        res.render('index', { posts, filterTag: tagFilter, loggedIn: req.session.isLoggedIn });
    } catch (err) {
        res.status(500).send('Error reading posts file');
        console.error('Error reading posts file:', err);
    }
});

// Route to handle login
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (username === 'mij' && password === 'Mijmicdk123!') {
        req.session.isLoggedIn = true;
        res.redirect('/');
    } else {
        res.status(401).send('Unauthorized');
    }
});

// Route to handle logout
app.post('/logout', (req, res) => {
    req.session.isLoggedIn = false;
    res.redirect('/');
});

// Route to add a new post
app.post('/add-post', async (req, res) => {
    if (!req.session.isLoggedIn) {
        return res.status(403).send('Forbidden');
    }

    const { title, content, tags } = req.body;

    try {
        const data = await fs.readFile(postsFilePath, 'utf8');
        let posts = JSON.parse(data);
        const newPost = {
            id: Date.now().toString(), // Unique ID for the post
            title,
            content,
            tags: tags ? tags.split(',').map(tag => tag.trim().toLowerCase()) : [], // Split tags by comma and trim whitespace
            date: new Date().toLocaleDateString() // Add the current date
        };
        posts.unshift(newPost); // Add new post at the beginning

        // Write updated posts to file
        await fs.writeFile(postsFilePath, JSON.stringify(posts, null, 2));
        res.redirect('/');
    } catch (err) {
        res.status(500).send('Error saving post');
        console.error('Error saving post:', err);
    }
	
	// Backup the posts file
    await backupPosts();
});

// Route to delete a post
app.post('/delete-post', async (req, res) => {
    const { id, password } = req.body;

    if (password !== 'Mijmicdk123!') {
        res.status(403).send('Forbidden');
        return;
    }

    try {
        const data = await fs.readFile(postsFilePath, 'utf8');
        let posts = JSON.parse(data);
        posts = posts.filter(post => post.id !== id);

        // Write updated posts to file
        await fs.writeFile(postsFilePath, JSON.stringify(posts, null, 2));
        res.redirect('/');
    } catch (err) {
        res.status(500).send('Error deleting post');
        console.error('Error deleting post:', err);
    }
});

// Route to serve the post details page
app.get('/post/:id', async (req, res) => {
    try {
        const data = await fs.readFile(postsFilePath, 'utf8');
        let posts = JSON.parse(data);
        const post = posts.find(post => post.id === req.params.id);
        if (!post) {
            return res.status(404).send('Post not found');
        }
        res.render('post', { post, loggedIn: req.session.isLoggedIn });
    } catch (err) {
        res.status(500).send('Error reading posts file');
        console.error('Error reading posts file:', err);
    }
});

// Route to serve the login page (if needed)
app.get('/login', (req, res) => {
    if (req.session.isLoggedIn) {
        return res.redirect('/');
    }
    res.render('login');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
