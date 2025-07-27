const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from public directory
app.use(express.static("public"));

// Set view engine to handle HTML templates
app.set("view engine", "html");
app.engine("html", require("ejs").renderFile);

// Home route that renders beautiful HTML
app.get("/", (req, res) => {
  const pageData = {
    title: "Welcome to My Beautiful App",
    heading: "Discover Something Amazing",
    subtitle: "A modern, elegant web experience built with Express.js",
    features: [
      {
        icon: "🚀",
        title: "Fast Performance",
        description: "Lightning-fast response times with optimized code",
      },
      {
        icon: "🎨",
        title: "Beautiful Design",
        description: "Modern, responsive design that works on all devices",
      },
      {
        icon: "⚡",
        title: "Easy to Use",
        description: "Simple, intuitive interface for the best user experience",
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
                padding: 100px 0;
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
                animation: fadeInUp 1s ease-out 0.6s forwards;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
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
                
                .features-grid {
                    grid-template-columns: 1fr;
                    gap: 30px;
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

        <footer class="footer">
            <div class="container">
                <p>&copy; 2025 Beautiful Express App. Made with ❤️ and Express.js</p>
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
        </script>
    </body>
    </html>
  `;

  res.send(htmlContent);
});

// API route example
app.get("/api/hello", (req, res) => {
  res.json({
    message: "Hello from Express API!",
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).send(`
    <h1>404 - Page Not Found</h1>
    <p>The page you're looking for doesn't exist.</p>
    <a href="/">Go back home</a>
  `);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📱 Open your browser and visit the URL above`);
});

module.exports = app;
