const express = require("express");
const mysql = require("mysql2/promise");
const path = require("path");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: false,
    // For cloud databases, we typically need SSL
    //ca: process.env.DB_SSL_CA || undefined,
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true,
};

// Separate config for initial connection (without database specified)
const initialDbConfig = {
  host: dbConfig.host,
  port: dbConfig.port,
  user: dbConfig.user,
  password: dbConfig.password,
  ssl: dbConfig.ssl,
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true,
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Middleware
app.use(express.static("public"));
app.use(express.json());
app.set("view engine", "html");
app.engine("html", require("ejs").renderFile);

// Database initialization
async function initDatabase() {
  let initialPool;
  let mainPool;

  try {
    console.log("🔄 Starting database initialization...");

    // First, connect without specifying a database to create it
    initialPool = mysql.createPool(initialDbConfig);
    const initialConnection = await initialPool.getConnection();

    console.log("✅ Connected to MySQL server");

    // Create the database if it doesn't exist
    console.log(
      `🔄 Creating database '${dbConfig.database}' if it doesn't exist...`
    );
    await initialConnection.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``
    );
    console.log(`✅ Database '${dbConfig.database}' is ready`);

    initialConnection.release();
    await initialPool.end();

    // Now connect to the specific database
    mainPool = mysql.createPool(dbConfig);
    const connection = await mainPool.getConnection();

    console.log(`✅ Connected to database '${dbConfig.database}'`);
    console.log("🔄 Creating tables...");

    // Create users table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✅ Users table ready");

    // Create projects table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS projects (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        status ENUM('planning', 'in-progress', 'completed') DEFAULT 'planning',
        user_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id)
      )
    `);
    console.log("✅ Projects table ready");

    // Create statistics table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS statistics (
        id INT AUTO_INCREMENT PRIMARY KEY,
        metric_name VARCHAR(100) NOT NULL UNIQUE,
        metric_value INT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log("✅ Statistics table ready");

    // Check if we need to insert sample data
    const [userRows] = await connection.execute(
      "SELECT COUNT(*) as count FROM users"
    );
    console.log(`📊 Found ${userRows[0].count} existing users`);

    if (userRows[0].count === 0) {
      console.log("🔄 Inserting sample data...");

      // Insert users
      await connection.execute(`
        INSERT INTO users (name, email, role) VALUES
        ('John Doe', 'john@example.com', 'admin'),
        ('Jane Smith', 'jane@example.com', 'developer'),
        ('Mike Johnson', 'mike@example.com', 'designer'),
        ('Sarah Wilson', 'sarah@example.com', 'user')
      `);
      console.log("✅ Sample users inserted");

      // Insert projects
      await connection.execute(`
        INSERT INTO projects (title, description, status, user_id) VALUES
        ('Website Redesign', 'Complete overhaul of company website with modern design', 'in-progress', 1),
        ('Mobile App Development', 'Native mobile app for iOS and Android platforms', 'planning', 2),
        ('Database Optimization', 'Improve database performance and scalability', 'completed', 2),
        ('User Authentication System', 'Implement secure login and registration system', 'in-progress', 1),
        ('API Documentation', 'Create comprehensive API documentation', 'planning', 2)
      `);
      console.log("✅ Sample projects inserted");

      // Insert statistics
      await connection.execute(`
        INSERT INTO statistics (metric_name, metric_value) VALUES
        ('total_users', 4),
        ('total_projects', 5),
        ('completed_projects', 1),
        ('active_projects', 2)
        ON DUPLICATE KEY UPDATE 
        metric_value = VALUES(metric_value)
      `);
      console.log("✅ Statistics initialized");
    }

    connection.release();
    await mainPool.end();

    console.log("🎉 Database initialization completed successfully!");
    console.log(
      `📊 Database '${dbConfig.database}' is ready with all tables and sample data`
    );
  } catch (error) {
    console.error("❌ Database initialization failed:", error.message);
    console.error("Error details:", error);

    // Clean up connections
    if (initialPool) {
      try {
        await initialPool.end();
      } catch (e) {
        /* ignore */
      }
    }
    if (mainPool) {
      try {
        await mainPool.end();
      } catch (e) {
        /* ignore */
      }
    }

    // Don't exit the process, let the app continue
    console.log("⚠️  App will continue with limited functionality");
  }
}

// Home route with database data
app.get("/", async (req, res) => {
  try {
    const connection = await pool.getConnection();

    // Get statistics
    const [stats] = await connection.execute("SELECT * FROM statistics");
    const statsObj = {};
    stats.forEach((stat) => {
      statsObj[stat.metric_name] = stat.metric_value;
    });

    // Get recent projects
    const [projects] = await connection.execute(`
      SELECT p.*, u.name as user_name 
      FROM projects p 
      JOIN users u ON p.user_id = u.id 
      ORDER BY p.created_at DESC 
      LIMIT 3
    `);

    // Get users count by role
    const [roleStats] = await connection.execute(`
      SELECT role, COUNT(*) as count 
      FROM users 
      GROUP BY role
    `);

    connection.release();

    const pageData = {
      title: "Welcome to My Beautiful App",
      heading: "Discover Something Amazing On Graphit software",
      subtitle:
        "A modern, elegant web experience built with Express.js & MySQL",
      stats: statsObj,
      recentProjects: projects,
      roleStats: roleStats,
      features: [
        {
          icon: "🚀",
          title: "Fast Performance",
          description:
            "Lightning-fast response times with optimized code and database queries",
        },
        {
          icon: "🎨",
          title: "Beautiful Design",
          description: "Modern, responsive design that works on all devices",
        },
        {
          icon: "💾",
          title: "Database Integration",
          description:
            "Seamless MySQL integration for dynamic content management",
        },
      ],
    };

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${pageData.title}</title>
          <style>
              * {
                  margin: 0;
                  padding: 0;
                  box-sizing: border-box;
              }

              body {
                  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                  line-height: 1.6;
                  color: #333;
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  min-height: 100vh;
                  overflow-x: hidden;
              }

              .container {
                  max-width: 1200px;
                  margin: 0 auto;
                  padding: 0 20px;
              }

              .hero {
                  text-align: center;
                  padding: 100px 0 50px 0;
                  color: white;
                  position: relative;
              }

              .hero::before {
                  content: '';
                  position: absolute;
                  top: 0;
                  left: 0;
                  right: 0;
                  bottom: 0;
                  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"><polygon fill="rgba(255,255,255,0.05)" points="0,0 1000,300 1000,1000 0,700"/></svg>');
                  pointer-events: none;
              }

              .hero-content {
                  position: relative;
                  z-index: 1;
              }

              .hero h1 {
                  font-size: 3.5rem;
                  font-weight: 700;
                  margin-bottom: 20px;
                  opacity: 0;
                  animation: fadeInUp 1s ease-out 0.2s forwards;
              }

              .hero p {
                  font-size: 1.25rem;
                  margin-bottom: 40px;
                  opacity: 0;
                  animation: fadeInUp 1s ease-out 0.4s forwards;
                  max-width: 600px;
                  margin-left: auto;
                  margin-right: auto;
              }

              .stats-grid {
                  display: grid;
                  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                  gap: 20px;
                  margin: 40px 0;
                  opacity: 0;
                  animation: fadeInUp 1s ease-out 0.6s forwards;
              }

              .stat-card {
                  background: rgba(255,255,255,0.1);
                  backdrop-filter: blur(10px);
                  padding: 30px 20px;
                  border-radius: 15px;
                  text-align: center;
                  border: 1px solid rgba(255,255,255,0.2);
                  transition: transform 0.3s ease;
              }

              .stat-card:hover {
                  transform: translateY(-5px);
              }

              .stat-number {
                  font-size: 2.5rem;
                  font-weight: 700;
                  display: block;
                  margin-bottom: 10px;
              }

              .stat-label {
                  font-size: 0.9rem;
                  text-transform: uppercase;
                  letter-spacing: 1px;
                  opacity: 0.9;
              }

              .cta-button {
                  display: inline-block;
                  background: linear-gradient(45deg, #ff6b6b, #ffd93d);
                  color: white;
                  padding: 15px 40px;
                  text-decoration: none;
                  border-radius: 50px;
                  font-weight: 600;
                  font-size: 1.1rem;
                  transition: all 0.3s ease;
                  opacity: 0;
                  animation: fadeInUp 1s ease-out 0.8s forwards;
                  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                  margin-top: 20px;
              }

              .cta-button:hover {
                  transform: translateY(-3px);
                  box-shadow: 0 15px 40px rgba(0,0,0,0.3);
              }

              .features {
                  background: white;
                  padding: 100px 0;
                  position: relative;
              }

              .features::before {
                  content: '';
                  position: absolute;
                  top: -50px;
                  left: 0;
                  right: 0;
                  height: 100px;
                  background: white;
                  border-radius: 50px 50px 0 0;
              }

              .section-title {
                  text-align: center;
                  font-size: 2.5rem;
                  font-weight: 700;
                  margin-bottom: 60px;
                  color: #333;
              }

              .features-grid {
                  display: grid;
                  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                  gap: 40px;
                  margin-top: 60px;
              }

              .feature-card {
                  background: white;
                  padding: 40px 30px;
                  border-radius: 20px;
                  text-align: center;
                  box-shadow: 0 20px 60px rgba(0,0,0,0.1);
                  transition: all 0.3s ease;
                  opacity: 0;
                  animation: fadeInUp 1s ease-out forwards;
              }

              .feature-card:nth-child(1) { animation-delay: 0.8s; }
              .feature-card:nth-child(2) { animation-delay: 1s; }
              .feature-card:nth-child(3) { animation-delay: 1.2s; }

              .feature-card:hover {
                  transform: translateY(-10px);
                  box-shadow: 0 30px 80px rgba(0,0,0,0.15);
              }

              .feature-icon {
                  font-size: 3rem;
                  margin-bottom: 20px;
                  display: block;
              }

              .feature-card h3 {
                  font-size: 1.5rem;
                  font-weight: 600;
                  margin-bottom: 15px;
                  color: #333;
              }

              .feature-card p {
                  color: #666;
                  line-height: 1.8;
              }

              .projects-section {
                  background: #f8f9fa;
                  padding: 80px 0;
              }

              .projects-grid {
                  display: grid;
                  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
                  gap: 30px;
                  margin-top: 40px;
              }

              .project-card {
                  background: white;
                  padding: 30px;
                  border-radius: 15px;
                  box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                  transition: transform 0.3s ease;
              }

              .project-card:hover {
                  transform: translateY(-5px);
              }

              .project-status {
                  display: inline-block;
                  padding: 5px 15px;
                  border-radius: 20px;
                  font-size: 0.8rem;
                  font-weight: 600;
                  text-transform: uppercase;
                  margin-bottom: 15px;
              }

              .status-planning { background: #fff3cd; color: #856404; }
              .status-in-progress { background: #d1ecf1; color: #0c5460; }
              .status-completed { background: #d4edda; color: #155724; }

              .project-title {
                  font-size: 1.3rem;
                  font-weight: 600;
                  margin-bottom: 10px;
                  color: #333;
              }

              .project-description {
                  color: #666;
                  margin-bottom: 15px;
                  line-height: 1.6;
              }

              .project-meta {
                  font-size: 0.9rem;
                  color: #888;
              }

              .footer {
                  background: #2c3e50;
                  color: white;
                  text-align: center;
                  padding: 40px 0;
              }

              .floating-elements {
                  position: fixed;
                  top: 0;
                  left: 0;
                  width: 100%;
                  height: 100%;
                  pointer-events: none;
                  z-index: 0;
              }

              .floating-element {
                  position: absolute;
                  background: rgba(255,255,255,0.1);
                  border-radius: 50%;
                  animation: float 6s ease-in-out infinite;
              }

              .floating-element:nth-child(1) {
                  width: 80px;
                  height: 80px;
                  top: 20%;
                  left: 10%;
                  animation-delay: 0s;
              }

              .floating-element:nth-child(2) {
                  width: 120px;
                  height: 120px;
                  top: 60%;
                  right: 10%;
                  animation-delay: 2s;
              }

              .floating-element:nth-child(3) {
                  width: 60px;
                  height: 60px;
                  top: 80%;
                  left: 20%;
                  animation-delay: 4s;
              }

              @keyframes fadeInUp {
                  from {
                      opacity: 0;
                      transform: translateY(30px);
                  }
                  to {
                      opacity: 1;
                      transform: translateY(0);
                  }
              }

              @keyframes float {
                  0%, 100% {
                      transform: translateY(0px) rotate(0deg);
                  }
                  50% {
                      transform: translateY(-20px) rotate(180deg);
                  }
              }

              @media (max-width: 768px) {
                  .hero h1 {
                      font-size: 2.5rem;
                  }
                  
                  .hero p {
                      font-size: 1.1rem;
                  }
                  
                  .stats-grid {
                      grid-template-columns: repeat(2, 1fr);
                  }
                  
                  .features-grid {
                      grid-template-columns: 1fr;
                      gap: 30px;
                  }
                  
                  .projects-grid {
                      grid-template-columns: 1fr;
                  }
                  
                  .section-title {
                      font-size: 2rem;
                  }
              }
          </style>
      </head>
      <body>
          <div class="floating-elements">
              <div class="floating-element"></div>
              <div class="floating-element"></div>
              <div class="floating-element"></div>
          </div>

          <section class="hero">
              <div class="container">
                  <div class="hero-content">
                      <h1>${pageData.heading}</h1>
                      <p>${pageData.subtitle}</p>
                      
                      <div class="stats-grid">
                          <div class="stat-card">
                              <span class="stat-number">${
                                pageData.stats.total_users || 0
                              }</span>
                              <span class="stat-label">Total Users</span>
                          </div>
                          <div class="stat-card">
                              <span class="stat-number">${
                                pageData.stats.total_projects || 0
                              }</span>
                              <span class="stat-label">Total Projects</span>
                          </div>
                          <div class="stat-card">
                              <span class="stat-number">${
                                pageData.stats.completed_projects || 0
                              }</span>
                              <span class="stat-label">Completed</span>
                          </div>
                          <div class="stat-card">
                              <span class="stat-number">${
                                pageData.stats.active_projects || 0
                              }</span>
                              <span class="stat-label">Active</span>
                          </div>
                      </div>
                      
                      <a href="#features" class="cta-button">Explore Features</a>
                  </div>
              </div>
          </section>

          <section class="features" id="features">
              <div class="container">
                  <h2 class="section-title">Why Choose Us?</h2>
                  <div class="features-grid">
                      ${pageData.features
                        .map(
                          (feature) => `
                          <div class="feature-card">
                              <span class="feature-icon">${feature.icon}</span>
                              <h3>${feature.title}</h3>
                              <p>${feature.description}</p>
                          </div>
                      `
                        )
                        .join("")}
                  </div>
              </div>
          </section>

          <section class="projects-section">
              <div class="container">
                  <h2 class="section-title">Recent Projects</h2>
                  <div class="projects-grid">
                      ${pageData.recentProjects
                        .map(
                          (project) => `
                          <div class="project-card">
                              <span class="project-status status-${project.status.replace(
                                "-",
                                "-"
                              )}">${project.status.replace("-", " ")}</span>
                              <h3 class="project-title">${project.title}</h3>
                              <p class="project-description">${
                                project.description
                              }</p>
                              <div class="project-meta">By ${
                                project.user_name
                              } • ${new Date(
                            project.created_at
                          ).toLocaleDateString()}</div>
                          </div>
                      `
                        )
                        .join("")}
                  </div>
              </div>
          </section>

          <footer class="footer">
              <div class="container">
                  <p>&copy; 2025 Beautiful Express App. Made with ❤️, Express.js & MySQL</p>
              </div>
          </footer>

          <script>
              // Smooth scrolling for anchor links
              document.querySelectorAll('a[href^="#"]').forEach(anchor => {
                  anchor.addEventListener('click', function (e) {
                      e.preventDefault();
                      document.querySelector(this.getAttribute('href')).scrollIntoView({
                          behavior: 'smooth'
                      });
                  });
              });

              // Add parallax effect to floating elements
              window.addEventListener('scroll', () => {
                  const scrolled = window.pageYOffset;
                  const parallax = document.querySelectorAll('.floating-element');
                  const speed = 0.5;

                  parallax.forEach(element => {
                      const yPos = -(scrolled * speed);
                      element.style.transform = \`translateY(\${yPos}px)\`;
                  });
              });

              // Auto-refresh stats every 30 seconds
              setInterval(async () => {
                  try {
                      const response = await fetch('/api/stats');
                      const stats = await response.json();
                      
                      document.querySelector('.stat-card:nth-child(1) .stat-number').textContent = stats.total_users;
                      document.querySelector('.stat-card:nth-child(2) .stat-number').textContent = stats.total_projects;
                      document.querySelector('.stat-card:nth-child(3) .stat-number').textContent = stats.completed_projects;
                      document.querySelector('.stat-card:nth-child(4) .stat-number').textContent = stats.active_projects;
                  } catch (error) {
                      console.error('Failed to refresh stats:', error);
                  }
              }, 30000);
          </script>
      </body>
      </html>
    `;

    res.send(htmlContent);
  } catch (error) {
    console.error("Error loading home page:", error);

    // Fallback to static content if database fails
    const fallbackData = {
      title: "Welcome to My Beautiful App",
      heading: "Discover Something Amazing",
      subtitle:
        "A modern, elegant web experience built with Express.js & MySQL",
      stats: {
        total_users: 0,
        total_projects: 0,
        completed_projects: 0,
        active_projects: 0,
      },
      recentProjects: [],
      roleStats: [],
      features: [
        {
          icon: "🚀",
          title: "Fast Performance",
          description:
            "Lightning-fast response times with optimized code and database queries",
        },
        {
          icon: "🎨",
          title: "Beautiful Design",
          description: "Modern, responsive design that works on all devices",
        },
        {
          icon: "💾",
          title: "Database Integration",
          description:
            "Seamless MySQL integration for dynamic content management",
        },
      ],
    };

    // Generate the same HTML but with fallback data
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${fallbackData.title}</title>
          <style>
              * {
                  margin: 0;
                  padding: 0;
                  box-sizing: border-box;
              }

              body {
                  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                  line-height: 1.6;
                  color: #333;
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  min-height: 100vh;
                  overflow-x: hidden;
              }

              .container {
                  max-width: 1200px;
                  margin: 0 auto;
                  padding: 0 20px;
              }

              .hero {
                  text-align: center;
                  padding: 100px 0 50px 0;
                  color: white;
                  position: relative;
              }

              .hero-content {
                  position: relative;
                  z-index: 1;
              }

              .hero h1 {
                  font-size: 3.5rem;
                  font-weight: 700;
                  margin-bottom: 20px;
              }

              .hero p {
                  font-size: 1.25rem;
                  margin-bottom: 40px;
                  max-width: 600px;
                  margin-left: auto;
                  margin-right: auto;
              }

              .error-notice {
                  background: rgba(255, 193, 7, 0.2);
                  border: 1px solid rgba(255, 193, 7, 0.5);
                  color: #fff;
                  padding: 15px;
                  border-radius: 10px;
                  margin: 20px 0;
                  text-align: center;
              }

              .cta-button {
                  display: inline-block;
                  background: linear-gradient(45deg, #ff6b6b, #ffd93d);
                  color: white;
                  padding: 15px 40px;
                  text-decoration: none;
                  border-radius: 50px;
                  font-weight: 600;
                  font-size: 1.1rem;
                  transition: all 0.3s ease;
                  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                  margin-top: 20px;
              }

              .features {
                  background: white;
                  padding: 100px 0;
                  position: relative;
              }

              .features::before {
                  content: '';
                  position: absolute;
                  top: -50px;
                  left: 0;
                  right: 0;
                  height: 100px;
                  background: white;
                  border-radius: 50px 50px 0 0;
              }

              .section-title {
                  text-align: center;
                  font-size: 2.5rem;
                  font-weight: 700;
                  margin-bottom: 60px;
                  color: #333;
              }

              .features-grid {
                  display: grid;
                  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                  gap: 40px;
                  margin-top: 60px;
              }

              .feature-card {
                  background: white;
                  padding: 40px 30px;
                  border-radius: 20px;
                  text-align: center;
                  box-shadow: 0 20px 60px rgba(0,0,0,0.1);
                  transition: all 0.3s ease;
              }

              .feature-icon {
                  font-size: 3rem;
                  margin-bottom: 20px;
                  display: block;
              }

              .feature-card h3 {
                  font-size: 1.5rem;
                  font-weight: 600;
                  margin-bottom: 15px;
                  color: #333;
              }

              .feature-card p {
                  color: #666;
                  line-height: 1.8;
              }

              .footer {
                  background: #2c3e50;
                  color: white;
                  text-align: center;
                  padding: 40px 0;
              }
          </style>
      </head>
      <body>
          <section class="hero">
              <div class="container">
                  <div class="hero-content">
                      <h1>${fallbackData.heading}</h1>
                      <p>${fallbackData.subtitle}</p>
                      
                      <div class="error-notice">
                          ⚠️ Database connection issue. Please check your database configuration and try again.
                      </div>
                      
                      <a href="#features" class="cta-button">Explore Features</a>
                  </div>
              </div>
          </section>

          <section class="features" id="features">
              <div class="container">
                  <h2 class="section-title">Why Choose Us?</h2>
                  <div class="features-grid">
                      ${fallbackData.features
                        .map(
                          (feature) => `
                          <div class="feature-card">
                              <span class="feature-icon">${feature.icon}</span>
                              <h3>${feature.title}</h3>
                              <p>${feature.description}</p>
                          </div>
                      `
                        )
                        .join("")}
                  </div>
              </div>
          </section>

          <footer class="footer">
              <div class="container">
                  <p>&copy; 2025 Beautiful Express App. Made with ❤️, Express.js & MySQL</p>
              </div>
          </footer>
      </body>
      </html>
    `;

    res.send(htmlContent);
  }
});

// API Routes
app.get("/api/stats", async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [stats] = await connection.execute("SELECT * FROM statistics");
    connection.release();

    const statsObj = {};
    stats.forEach((stat) => {
      statsObj[stat.metric_name] = stat.metric_value;
    });

    res.json(statsObj);
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
});

app.get("/api/users", async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [users] = await connection.execute(
      "SELECT id, name, email, role, created_at FROM users"
    );
    connection.release();

    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

app.get("/api/projects", async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [projects] = await connection.execute(`
      SELECT p.*, u.name as user_name 
      FROM projects p 
      JOIN users u ON p.user_id = u.id 
      ORDER BY p.created_at DESC
    `);
    connection.release();

    res.json(projects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

app.post("/api/projects", async (req, res) => {
  try {
    const { title, description, user_id } = req.body;

    if (!title || !user_id) {
      return res.status(400).json({ error: "Title and user_id are required" });
    }

    const connection = await pool.getConnection();
    const [result] = await connection.execute(
      "INSERT INTO projects (title, description, user_id) VALUES (?, ?, ?)",
      [title, description || "", user_id]
    );

    // Update total projects count
    await connection.execute(
      'UPDATE statistics SET metric_value = metric_value + 1 WHERE metric_name = "total_projects"'
    );

    connection.release();

    res.json({
      id: result.insertId,
      message: "Project created successfully",
    });
  } catch (error) {
    console.error("Error creating project:", error);
    res.status(500).json({ error: "Failed to create project" });
  }
});

// Dashboard route
app.get("/dashboard", async (req, res) => {
  try {
    const connection = await pool.getConnection();

    const [users] = await connection.execute(
      "SELECT * FROM users ORDER BY created_at DESC"
    );
    const [projects] = await connection.execute(`
      SELECT p.*, u.name as user_name 
      FROM projects p 
      JOIN users u ON p.user_id = u.id 
      ORDER BY p.created_at DESC
    `);

    connection.release();

    const dashboardHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Dashboard</title>
          <style>
              body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
              .container { max-width: 1200px; margin: 0 auto; }
              .header { background: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
              .card { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              .card h2 { margin-top: 0; color: #333; }
              table { width: 100%; border-collapse: collapse; }
              th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
              th { background: #f8f9fa; font-weight: 600; }
              .status { padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; }
              .status-planning { background: #fff3cd; color: #856404; }
              .status-in-progress { background: #d1ecf1; color: #0c5460; }
              .status-completed { background: #d4edda; color: #155724; }
              .btn { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; }
              .btn:hover { background: #0056b3; }
              a { color: #007bff; text-decoration: none; }
              a:hover { text-decoration: underline; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>Dashboard</h1>
                  <p>Manage users and projects</p>
                  <a href="/" class="btn">← Back to Home</a>
              </div>
              
              <div class="grid">
                  <div class="card">
                      <h2>Users (${users.length})</h2>
                      <table>
                          <thead>
                              <tr>
                                  <th>Name</th>
                                  <th>Email</th>
                                  <th>Role</th>
                                  <th>Joined</th>
                              </tr>
                          </thead>
                          <tbody>
                              ${users
                                .map(
                                  (user) => `
                                  <tr>
                                      <td>${user.name}</td>
                                      <td>${user.email}</td>
                                      <td>${user.role}</td>
                                      <td>${new Date(
                                        user.created_at
                                      ).toLocaleDateString()}</td>
                                  </tr>
                              `
                                )
                                .join("")}
                          </tbody>
                      </table>
                  </div>
                  
                  <div class="card">
                      <h2>Projects (${projects.length})</h2>
                      <table>
                          <thead>
                              <tr>
                                  <th>Title</th>
                                  <th>Status</th>
                                  <th>Owner</th>
                                  <th>Created</th>
                              </tr>
                          </thead>
                          <tbody>
                              ${projects
                                .map(
                                  (project) => `
                                  <tr>
                                      <td>${project.title}</td>
                                      <td><span class="status status-${project.status.replace(
                                        "-",
                                        "-"
                                      )}">${project.status.replace(
                                    "-",
                                    " "
                                  )}</span></td>
                                      <td>${project.user_name}</td>
                                      <td>${new Date(
                                        project.created_at
                                      ).toLocaleDateString()}</td>
                                  </tr>
                              `
                                )
                                .join("")}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      </body>
      </html>
    `;

    res.send(dashboardHtml);
  } catch (error) {
    console.error("Error loading dashboard:", error);
    res.status(500).send("Internal Server Error");
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).send(`
    <h1>404 - Page Not Found</h1>
    <p>The page you're looking for doesn't exist.</p>
    <a href="/">Go back home</a>
  `);
});

// Initialize database and start server
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📱 Open your browser and visit the URL above`);
    console.log(`📊 Visit http://localhost:${PORT}/dashboard for admin panel`);
  });
});

module.exports = app;
