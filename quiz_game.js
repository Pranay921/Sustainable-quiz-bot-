document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const startScreen = document.getElementById('start-screen');
    const loadingScreen = document.getElementById('loading-screen');
    const quizScreen = document.getElementById('quiz-screen');
    const resultsScreen = document.getElementById('results-screen');
    
    const startBtn = document.getElementById('start-btn');
    const nextBtn = document.getElementById('next-btn');
    const restartBtn = document.getElementById('restart-btn');
    
    const questionText = document.getElementById('question-text');
    const optionsContainer = document.getElementById('options-container');
    const progressBar = document.getElementById('progress-bar');
    const scoreElement = document.getElementById('score');
    const finalScoreElement = document.getElementById('final-score');
    const performanceMessage = document.getElementById('performance-message');
    const currentQuestionElement = document.getElementById('current-question');
    const totalQuestionsElement = document.getElementById('total-questions');
    
    const feedbackContainer = document.getElementById('feedback-container');
    const feedbackIcon = document.getElementById('feedback-icon');
    const feedbackText = document.getElementById('feedback-text');
    
    // Audio elements
    const correctSound = document.getElementById('correct-sound');
    const incorrectSound = document.getElementById('incorrect-sound');
    const backgroundMusic = document.getElementById('background-music');
    
    // Game variables
    let questions = [];
    let currentQuestionIndex = 0;
    let score = 0;
    let selectedOption = null;
    
    // Event listeners
    startBtn.addEventListener('click', startQuiz);
    nextBtn.addEventListener('click', loadNextQuestion);
    restartBtn.addEventListener('click', restartQuiz);
    
    // Start the quiz
    function startQuiz() {
        startScreen.classList.add('hidden');
        loadingScreen.classList.remove('hidden');
        
        // Play background music
        backgroundMusic.volume = 0.3;
        backgroundMusic.play().catch(error => {
            console.log('Background music autoplay prevented:', error);
        });
        
        // Fetch questions from the API
        fetch('/get_questions')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                questions = data;
                totalQuestionsElement.textContent = questions.length;
                
                // Simulate loading for better UX (minimum 1.5 seconds)
                setTimeout(() => {
                    loadingScreen.classList.add('hidden');
                    quizScreen.classList.remove('hidden');
                    loadQuestion(0);
                }, 1500);
            })
            .catch(error => {
                console.error('Error fetching questions:', error);
                alert('Failed to load questions. Please try again.');
                loadingScreen.classList.add('hidden');
                startScreen.classList.remove('hidden');
            });
    }
    
    // Load a question by index
    function loadQuestion(index) {
        // Update progress
        currentQuestionIndex = index;
        currentQuestionElement.textContent = index + 1;
        progressBar.style.width = `${((index + 1) / questions.length) * 100}%`;
        
        // Reset state
        feedbackContainer.classList.add('hidden');
        selectedOption = null;
        
        // Load question and options
        const question = questions[index];
        questionText.textContent = question.question;
        
        // Clear previous options
        optionsContainer.innerHTML = '';
        
        // Create option elements
        const optionLetters = ['A', 'B', 'C', 'D'];
        question.options.forEach((option, i) => {
            const optionElement = document.createElement('div');
            optionElement.classList.add('option');
            optionElement.innerHTML = `
                <div class="option-prefix">${optionLetters[i]}</div>
                <div class="option-text">${option}</div>
            `;
            
            optionElement.addEventListener('click', () => selectOption(optionElement, optionLetters[i], question.correct_answer));
            optionsContainer.appendChild(optionElement);
        });
    }
    
    // Handle option selection
    function selectOption(optionElement, selectedLetter, correctAnswer) {
        // Prevent selecting another option after one is selected
        if (selectedOption) return;
        
        selectedOption = selectedLetter;
        const isCorrect = selectedLetter === correctAnswer;
        
        // Mark selected option as correct or incorrect
        optionElement.classList.add(isCorrect ? 'correct' : 'incorrect');
        
        // Mark correct answer if user selected wrong
        if (!isCorrect) {
            const correctIndex = correctAnswer.charCodeAt(0) - 'A'.charCodeAt(0);
            optionsContainer.children[correctIndex].classList.add('correct');
        }
        
        // Update score if correct
        if (isCorrect) {
            score += 10;
            scoreElement.textContent = score;
            correctSound.play().catch(e => console.log('Audio play prevented:', e));
        } else {
            incorrectSound.play().catch(e => console.log('Audio play prevented:', e));
        }
        
        // Show feedback
        feedbackIcon.className = 'feedback-icon ' + (isCorrect ? 'correct' : 'incorrect');
        feedbackText.textContent = questions[currentQuestionIndex].explanation;
        feedbackContainer.classList.remove('hidden');
        
        // Disable all options
        Array.from(optionsContainer.children).forEach(option => {
            option.style.pointerEvents = 'none';
        });
    }
    
    // Load the next question
    function loadNextQuestion() {
        if (currentQuestionIndex < questions.length - 1) {
            loadQuestion(currentQuestionIndex + 1);
        } else {
            showResults();
        }
    }
    
    // Show the results screen
    function showResults() {
        quizScreen.classList.add('hidden');
        resultsScreen.classList.remove('hidden');
        
        finalScoreElement.textContent = score;
        
        // Set performance message based on score
        if (score === 100) {
            performanceMessage.textContent = "Perfect score! You're a sustainability expert! 🌟";
            triggerConfetti();
        } else if (score >= 80) {
            performanceMessage.textContent = "Great job! You have excellent knowledge about sustainability! 🌱";
        } else if (score >= 60) {
            performanceMessage.textContent = "Good effort! You're on your way to becoming a sustainability champion! 🌍";
        } else if (score >= 40) {
            performanceMessage.textContent = "Not bad! Keep learning about sustainability to improve your score! 💧";
        } else {
            performanceMessage.textContent = "There's room for improvement. Keep exploring sustainability topics! 🌿";
        }
    }
    
    // Restart the quiz
    function restartQuiz() {
        // Reset game variables
        currentQuestionIndex = 0;
        score = 0;
        scoreElement.textContent = score;
        
        // Hide results screen and show start screen
        resultsScreen.classList.add('hidden');
        startScreen.classList.remove('hidden');
        
        // Stop background music
        backgroundMusic.pause();
        backgroundMusic.currentTime = 0;
    }
    
    // Trigger confetti animation for perfect score
    function triggerConfetti() {
        const duration = 5 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
        
        function randomInRange(min, max) {
            return Math.random() * (max - min) + min;
        }
        
        const interval = setInterval(function() {
            const timeLeft = animationEnd - Date.now();
            
            if (timeLeft <= 0) {
                return clearInterval(interval);
            }
            
            const particleCount = 50 * (timeLeft / duration);
            
            // Since particles fall down, start a bit higher than random
            confetti(Object.assign({}, defaults, { 
                particleCount, 
                origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } 
            }));
            confetti(Object.assign({}, defaults, { 
                particleCount, 
                origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } 
            }));
        }, 250);
    }
});