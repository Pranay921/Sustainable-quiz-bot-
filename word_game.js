document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const startScreen = document.getElementById('start-screen');
    const loadingScreen = document.getElementById('loading-screen');
    const gameScreen = document.getElementById('game-screen');
    const resultsScreen = document.getElementById('results-screen');
    
    const hangmanMode = document.getElementById('hangman-mode');
    const scrambleMode = document.getElementById('scramble-mode');
    const difficultySelect = document.getElementById('difficulty');
    const timeModeSelect = document.getElementById('time-mode');
    const startBtn = document.getElementById('start-btn');
    
    const hangmanArea = document.getElementById('hangman-area');
    const scrambleArea = document.getElementById('scramble-area');
    
    const scoreElement = document.getElementById('score');
    const timerElement = document.getElementById('timer');
    const timerContainer = document.getElementById('timer-container');
    const currentWordElement = document.getElementById('current-word');
    const totalWordsElement = document.getElementById('total-words');
    
    const wordDisplay = document.getElementById('word-display');
    const keyboard = document.getElementById('keyboard');
    const hintBtn = document.getElementById('hint-btn');
    const hintText = document.getElementById('hint-text');
    
    const scrambledWordElement = document.getElementById('scrambled-word');
    const scrambleInput = document.getElementById('scramble-input');
    const submitBtn = document.getElementById('submit-btn');
    const scrambleHintBtn = document.getElementById('scramble-hint-btn');
    const scrambleHintText = document.getElementById('scramble-hint-text');
    
    const skipBtn = document.getElementById('skip-btn');
    const restartGameBtn = document.getElementById('restart-game-btn');
    
    const finalScoreElement = document.getElementById('final-score');
    const performanceMessage = document.getElementById('performance-message');
    const wordSummary = document.getElementById('word-summary');
    const playAgainBtn = document.getElementById('play-again-btn');
    const shareResultBtn = document.getElementById('share-result-btn');
    
    const hintModal = document.getElementById('hint-modal');
    const modalHintText = document.getElementById('modal-hint-text');
    const closeModal = document.querySelector('.close-modal');
    
    // Game variables
    let words = [];
    let currentWordIndex = 0;
    let score = 0;
    let timer;
    let timeLeft = 60;
    let gameMode = 'hangman'; // 'hangman' or 'scramble'
    let difficulty = 'medium';
    let timeMode = 'timed'; // 'timed' or 'unlimited'
    let currentWord = '';
    let currentHint = '';
    let guessedLetters = [];
    let incorrectGuesses = 0;
    let maxIncorrectGuesses = 10;
    let wordHistory = [];
    let hintsUsed = 0;
    let skipsUsed = 0;
    
    // Initialize game
    init();
    
    function init() {
        // Set up event listeners
        hangmanMode.addEventListener('click', () => selectGameMode('hangman'));
        scrambleMode.addEventListener('click', () => selectGameMode('scramble'));
        startBtn.addEventListener('click', startGame);
        
        hintBtn.addEventListener('click', showHint);
        scrambleHintBtn.addEventListener('click', showScrambleHint);
        
        submitBtn.addEventListener('click', checkScrambleAnswer);
        scrambleInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                checkScrambleAnswer();
            }
        });
        
        skipBtn.addEventListener('click', skipWord);
        restartGameBtn.addEventListener('click', restartGame);
        
        playAgainBtn.addEventListener('click', () => {
            resultsScreen.classList.add('hidden');
            startScreen.classList.remove('hidden');
        });
        
        shareResultBtn.addEventListener('click', shareResults);
        
        closeModal.addEventListener('click', () => {
            hintModal.classList.add('hidden');
        });
        
        hintModal.addEventListener('click', (e) => {
            if (e.target === hintModal) {
                hintModal.classList.add('hidden');
            }
        });
        
        // Select hangman mode by default
        selectGameMode('hangman');
    }
    
    // Select game mode
    function selectGameMode(mode) {
        gameMode = mode;
        
        // Update UI
        hangmanMode.classList.remove('selected');
        scrambleMode.classList.remove('selected');
        
        if (mode === 'hangman') {
            hangmanMode.classList.add('selected');
        } else {
            scrambleMode.classList.add('selected');
        }
    }
    
    // Start the game
    function startGame() {
        // Get options
        difficulty = difficultySelect.value;
        timeMode = timeModeSelect.value;
        
        // Reset game state
        currentWordIndex = 0;
        score = 0;
        wordHistory = [];
        hintsUsed = 0;
        skipsUsed = 0;
        
        // Update UI
        scoreElement.textContent = score;
        
        // Show loading screen
        startScreen.classList.add('hidden');
        loadingScreen.classList.remove('hidden');
        
        // Fetch words from API
        fetchWords()
            .then(() => {
                // Set total words
                totalWordsElement.textContent = words.length;
                currentWordElement.textContent = currentWordIndex + 1;
                
                // Set up timer if in timed mode
                if (timeMode === 'timed') {
                    timeLeft = 60;
                    timerElement.textContent = timeLeft;
                    timerContainer.classList.remove('hidden');
                    startTimer();
                } else {
                    timerContainer.classList.add('hidden');
                }
                
                // Show game screen
                loadingScreen.classList.add('hidden');
                gameScreen.classList.remove('hidden');
                
                // Show appropriate game area
                if (gameMode === 'hangman') {
                    hangmanArea.classList.remove('hidden');
                    scrambleArea.classList.add('hidden');
                    setupHangman();
                } else {
                    hangmanArea.classList.add('hidden');
                    scrambleArea.classList.remove('hidden');
                    setupScramble();
                }
            })
            .catch(error => {
                console.error('Error fetching words:', error);
                // Use fallback words
                words = getFallbackWords();
                totalWordsElement.textContent = words.length;
                currentWordElement.textContent = currentWordIndex + 1;
                
                // Set up timer if in timed mode
                if (timeMode === 'timed') {
                    timeLeft = 60;
                    timerElement.textContent = timeLeft;
                    timerContainer.classList.remove('hidden');
                    startTimer();
                } else {
                    timerContainer.classList.add('hidden');
                }
                
                // Show game screen
                loadingScreen.classList.add('hidden');
                gameScreen.classList.remove('hidden');
                
                // Show appropriate game area
                if (gameMode === 'hangman') {
                    hangmanArea.classList.remove('hidden');
                    scrambleArea.classList.add('hidden');
                    setupHangman();
                } else {
                    hangmanArea.classList.add('hidden');
                    scrambleArea.classList.remove('hidden');
                    setupScramble();
                }
            });
    }
    
    // Fetch words from API
    async function fetchWords() {
        try {
            const response = await fetch('/get_words?difficulty=' + difficulty + '&mode=' + gameMode);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            words = data;
            return words;
        } catch (error) {
            console.error('Error fetching words:', error);
            words = getFallbackWords();
            return words;
        }
    }
    
    // Get fallback words if API fails
    function getFallbackWords() {
        const easyWords = [
            { word: "RECYCLE", hint: "Process of converting waste into reusable material" },
            { word: "GREEN", hint: "Color associated with environmental movements" },
            { word: "EARTH", hint: "Our home planet" },
            { word: "WATER", hint: "Essential resource for all life" },
            { word: "SOLAR", hint: "Relating to energy from the sun" },
            { word: "PLANT", hint: "Living organism that produces oxygen" },
            { word: "CLEAN", hint: "Free from pollution" },
            { word: "WASTE", hint: "Unwanted or unusable material" },
            { word: "REUSE", hint: "Use again or more than once" },
            { word: "ECO", hint: "Prefix relating to the environment" }
        ];
        
        const mediumWords = [
            { word: "COMPOST", hint: "Decayed organic material used as plant fertilizer" },
            { word: "CLIMATE", hint: "Long-term weather patterns in an area" },
            { word: "ORGANIC", hint: "Produced without artificial chemicals" },
            { word: "ECOLOGY", hint: "Study of interactions between organisms and environment" },
            { word: "BIOFUEL", hint: "Fuel derived from organic matter" },
            { word: "CARBON", hint: "Element that forms the basis of greenhouse gases" },
            { word: "HABITAT", hint: "Natural home of an animal or plant" },
            { word: "WETLAND", hint: "Land area saturated with water" },
            { word: "OZONE", hint: "Layer in the atmosphere that protects from UV radiation" },
            { word: "FOREST", hint: "Large area covered with trees" }
        ];
        
        const hardWords = [
            { word: "BIODIVERSITY", hint: "Variety of plant and animal life in a habitat" },
            { word: "SUSTAINABLE", hint: "Able to be maintained at a certain rate or level" },
            { word: "CONSERVATION", hint: "Protection of natural resources" },
            { word: "DEFORESTATION", hint: "Clearing of forests on a large scale" },
            { word: "PHOTOVOLTAIC", hint: "Converting light into electricity" },
            { word: "HYDROELECTRIC", hint: "Generating electricity using flowing water" },
            { word: "PERMACULTURE", hint: "Agricultural ecosystem intended to be sustainable" },
            { word: "DESERTIFICATION", hint: "Process by which fertile land becomes desert" },
            { word: "EUTROPHICATION", hint: "Excessive richness of nutrients in a body of water" },
            { word: "GEOTHERMAL", hint: "Relating to heat from the earth's interior" }
        ];
        
        if (difficulty === 'easy') {
            return easyWords;
        } else if (difficulty === 'hard') {
            return hardWords;
        } else {
            return mediumWords;
        }
    }
    
    // Start timer for timed mode
    function startTimer() {
        clearInterval(timer);
        timer = setInterval(() => {
            timeLeft--;
            timerElement.textContent = timeLeft;
            
            if (timeLeft <= 10) {
                timerElement.classList.add('warning');
            } else {
                timerElement.classList.remove('warning');
            }
            
            if (timeLeft <= 0) {
                clearInterval(timer);
                endGame();
            }
        }, 1000);
    }
    
    // Setup hangman game
    function setupHangman() {
        // Reset hangman state
        incorrectGuesses = 0;
        guessedLetters = [];
        
        // Reset hangman drawing
        document.querySelectorAll('#hangman-drawing svg *').forEach(el => {
            el.classList.add('hidden');
            el.classList.remove('visible');
        });
        
        // Get current word
        currentWord = words[currentWordIndex].word;
        currentHint = words[currentWordIndex].hint;
        
        // Clear hint
        hintText.textContent = '';
        hintText.classList.add('hidden');
        
        // Create word display
        wordDisplay.innerHTML = '';
        for (let i = 0; i < currentWord.length; i++) {
            const letterBox = document.createElement('div');
            letterBox.className = 'letter-box';
            letterBox.dataset.letter = currentWord[i];
            wordDisplay.appendChild(letterBox);
        }
        
        // Create keyboard
        keyboard.innerHTML = '';
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        for (let i = 0; i < letters.length; i++) {
            const key = document.createElement('div');
            key.className = 'key';
            key.textContent = letters[i];
            key.addEventListener('click', () => {
                if (!key.classList.contains('used')) {
                    guessLetter(letters[i], key);
                }
            });
            keyboard.appendChild(key);
        }
        
        // Add keyboard event listener
        document.addEventListener('keydown', handleKeyPress);
    }
    
    // Handle keyboard input for hangman
    function handleKeyPress(e) {
        if (gameMode !== 'hangman' || gameScreen.classList.contains('hidden')) {
            return;
        }
        
        const key = e.key.toUpperCase();
        if (/^[A-Z]$/.test(key)) {
            const keyElement = Array.from(keyboard.children).find(k => k.textContent === key);
            if (keyElement && !keyElement.classList.contains('used')) {
                guessLetter(key, keyElement);
            }
        }
    }
    
    // Guess a letter in hangman
    function guessLetter(letter, keyElement) {
        if (guessedLetters.includes(letter)) {
            return;
        }
        
        guessedLetters.push(letter);
        keyElement.classList.add('used');
        
        if (currentWord.includes(letter)) {
            // Correct guess
            keyElement.classList.add('correct');
            
            // Update word display
            const letterBoxes = wordDisplay.querySelectorAll('.letter-box');
            let foundCount = 0;
            
            for (let i = 0; i < currentWord.length; i++) {
                if (currentWord[i] === letter) {
                    letterBoxes[i].textContent = letter;
                    foundCount++;
                }
            }
            
            // Add points based on letter frequency
            const pointsPerLetter = 5;
            const points = foundCount * pointsPerLetter;
            updateScore(points);
            
            // Check if word is complete
            const isComplete = Array.from(letterBoxes).every(box => box.textContent !== '');
            if (isComplete) {
                // Bonus points for completing word
                const bonusPoints = 20;
                updateScore(bonusPoints, 'Bonus!');
                
                // Add to word history
                wordHistory.push({
                    word: currentWord,
                    completed: true,
                    hintsUsed: hintsUsed > 0
                });
                
                // Move to next word after delay
                setTimeout(() => {
                    nextWord();
                }, 1500);
            }
        } else {
            // Incorrect guess
            keyElement.classList.add('incorrect');
            incorrectGuesses++;
            
            // Update hangman drawing
            updateHangmanDrawing();
            
            // Check if game over
            if (incorrectGuesses >= maxIncorrectGuesses) {
                // Add to word history
                wordHistory.push({
                    word: currentWord,
                    completed: false,
                    hintsUsed: hintsUsed > 0
                });
                
                // Show the word
                const letterBoxes = wordDisplay.querySelectorAll('.letter-box');
                for (let i = 0; i < currentWord.length; i++) {
                    letterBoxes[i].textContent = currentWord[i];
                    letterBoxes[i].classList.add('missed');
                }
                
                // Move to next word after delay
                setTimeout(() => {
                    nextWord();
                }, 2000);
            }
        }
    }
    
    // Update hangman drawing based on incorrect guesses
    function updateHangmanDrawing() {
        const hangmanParts = [
            'base', 'pole', 'top', 'rope', 'head', 
            'body', 'left-arm', 'right-arm', 'left-leg', 'right-leg'
        ];
        
        if (incorrectGuesses <= hangmanParts.length) {
            const part = document.getElementById(hangmanParts[incorrectGuesses - 1]);
            part.classList.remove('hidden');
            part.classList.add('visible');
        }
    }
    
    // Setup word scramble game
    function setupScramble() {
        // Get current word
        currentWord = words[currentWordIndex].word;
        currentHint = words[currentWordIndex].hint;
        
        // Clear hint
        scrambleHintText.textContent = '';
        scrambleHintText.classList.add('hidden');
        
        // Scramble the word
        const scrambledWord = scrambleWord(currentWord);
        scrambledWordElement.textContent = scrambledWord;
        
        // Clear input
        scrambleInput.value = '';
        scrambleInput.disabled = false;
        submitBtn.disabled = false;
        scrambleInput.focus();
    }
    
    // Scramble a word
    function scrambleWord(word) {
        const letters = word.split('');
        
        // Shuffle the letters
        for (let i = letters.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [letters[i], letters[j]] = [letters[j], letters[i]];
        }
        
        // Make sure the scrambled word is different from the original
        let scrambled = letters.join('');
        if (scrambled === word) {
            return scrambleWord(word);
        }
        
        return scrambled;
    }
    
    // Check scramble answer
    function checkScrambleAnswer() {
        const answer = scrambleInput.value.trim().toUpperCase();
        
        if (answer === '') {
            return;
        }
        
        if (answer === currentWord) {
            // Correct answer
            scrambleInput.disabled = true;
            submitBtn.disabled = true;
            
            // Calculate points based on word length and time
            const basePoints = 10;
            const lengthBonus = currentWord.length;
            const timeBonus = timeMode === 'timed' ? Math.min(10, Math.floor(timeLeft / 6)) : 0;
            const totalPoints = basePoints + lengthBonus + timeBonus;
            
            // Update score
            updateScore(totalPoints, 'Correct!');
            
            // Add to word history
            wordHistory.push({
                word: currentWord,
                completed: true,
                hintsUsed: hintsUsed > 0
            });
            
            // Show success message
            showToast('Correct! +' + totalPoints + ' points');
            
            // Move to next word after delay
            setTimeout(() => {
                nextWord();
            }, 1500);
        } else {
            // Incorrect answer
            scrambleInput.classList.add('error');
            showToast('Try again!');
            
            // Remove error class after animation
            setTimeout(() => {
                scrambleInput.classList.remove('error');
            }, 500);
        }
    }
    
    // Show hint for hangman
    function showHint() {
        hintsUsed++;
        
        // Penalty for using hint
        const hintPenalty = -5;
        updateScore(hintPenalty, 'Hint penalty');
        
        // Show hint
        hintText.textContent = currentHint;
        hintText.classList.remove('hidden');
    }
    
    // Show hint for scramble
    function showScrambleHint() {
        hintsUsed++;
        
        // Penalty for using hint
        const hintPenalty = -5;
        updateScore(hintPenalty, 'Hint penalty');
        
        // Show hint
        scrambleHintText.textContent = currentHint;
        scrambleHintText.classList.remove('hidden');
    }
    
    // Skip current word
    function skipWord() {
        skipsUsed++;
        
        // Penalty for skipping
        const skipPenalty = -10;
        updateScore(skipPenalty, 'Skip penalty');
        
        // Add to word history
        wordHistory.push({
            word: currentWord,
            completed: false,
            skipped: true,
            hintsUsed: hintsUsed > 0
        });
        
        // Move to next word
        nextWord();
    }
    
    // Move to next word
    function nextWord() {
        currentWordIndex++;
        hintsUsed = 0;
        
        // Remove keyboard event listener
        document.removeEventListener('keydown', handleKeyPress);
        
        // Check if game is over
        if (currentWordIndex >= words.length) {
            endGame();
            return;
        }
        
        // Update word counter
        currentWordElement.textContent = currentWordIndex + 1;
        
        // Setup next word
        if (gameMode === 'hangman') {
            setupHangman();
        } else {
            setupScramble();
        }
    }
    
    // Update score with animation
    function updateScore(points, message) {
        score += points;
        scoreElement.textContent = score;
        
        // Create points animation
        const pointsAnimation = document.createElement('div');
        pointsAnimation.className = 'points-animation';
        pointsAnimation.classList.add(points > 0 ? 'positive' : 'negative');
        pointsAnimation.textContent = points > 0 ? '+' + points : points;
        
        if (message) {
            pointsAnimation.textContent += ' ' + message;
        }
        
        // Position the animation
        if (gameMode === 'hangman') {
            const keyboardRect = keyboard.getBoundingClientRect();
            pointsAnimation.style.left = keyboardRect.left + keyboardRect.width / 2 + 'px';
            pointsAnimation.style.top = keyboardRect.top + 'px';
        } else {
            const inputRect = scrambleInput.getBoundingClientRect();
            pointsAnimation.style.left = inputRect.left + inputRect.width / 2 + 'px';
            pointsAnimation.style.top = inputRect.top + 'px';
        }
        
        document.body.appendChild(pointsAnimation);
        
        // Remove animation after it completes
        setTimeout(() => {
            document.body.removeChild(pointsAnimation);
        }, 1500);
    }
    
    // Show toast notification
    function showToast(message) {
        // Create toast if it doesn't exist
        let toast = document.querySelector('.toast-notification');
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'toast-notification';
            document.body.appendChild(toast);
        }
        
        toast.textContent = message;
        toast.classList.add('show');
        
        // Hide toast after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
    
    // Restart game
    function restartGame() {
        // Clear timer
        clearInterval(timer);
        
        // Reset game state
        currentWordIndex = 0;
        score = 0;
        wordHistory = [];
        hintsUsed = 0;
        skipsUsed = 0;
        
        // Update UI
        scoreElement.textContent = score;
        currentWordElement.textContent = currentWordIndex + 1;
        
        // Set up timer if in timed mode
        if (timeMode === 'timed') {
            timeLeft = 60;
            timerElement.textContent = timeLeft;
            startTimer();
        }
        
        // Setup first word
        if (gameMode === 'hangman') {
            setupHangman();
        } else {
            setupScramble();
        }
    }
    
    // End game and show results
    function endGame() {
        // Clear timer
        clearInterval(timer);
        
        // Remove keyboard event listener
        document.removeEventListener('keydown', handleKeyPress);
        
        // Update final score
        finalScoreElement.textContent = score;
        
        // Generate performance message
        let performanceText = '';
        if (score >= 200) {
            performanceText = 'Amazing! You\'re a sustainability word master!';
        } else if (score >= 150) {
            performanceText = 'Great job! Your knowledge of sustainability terms is impressive!';
        } else if (score >= 100) {
            performanceText = 'Good work! You know your sustainability vocabulary.';
        } else if (score >= 50) {
            performanceText = 'Nice effort! Keep learning about sustainability terms.';
        } else {
            performanceText = 'Keep practicing! You\'ll improve your sustainability vocabulary.';
        }
        performanceMessage.textContent = performanceText;
        
        // Generate word summary
        wordSummary.innerHTML = '';
        const completedWords = wordHistory.filter(w => w.completed).length;
        const totalWords = wordHistory.length;
        const completionRate = Math.round((completedWords / totalWords) * 100);
        
        const summaryHeader = document.createElement('h3');
        summaryHeader.textContent = `Words Completed: ${completedWords}/${totalWords} (${completionRate}%)`;
        wordSummary.appendChild(summaryHeader);
        
        // Add word list
        wordHistory.forEach((wordData, index) => {
            const wordItem = document.createElement('div');
            wordItem.className = 'word-item';
            wordItem.classList.add(wordData.completed ? 'correct' : 'incorrect');
            
            const wordText = document.createElement('span');
            wordText.textContent = `${index + 1}. ${wordData.word}`;
            
            const wordStatus = document.createElement('span');
            if (wordData.completed) {
                wordStatus.textContent = wordData.hintsUsed ? '✓ (with hint)' : '✓';
            } else if (wordData.skipped) {
                wordStatus.textContent = 'Skipped';
            } else {
                wordStatus.textContent = '✗';
            }
            
            wordItem.appendChild(wordText);
            wordItem.appendChild(wordStatus);
            wordSummary.appendChild(wordItem);
        });
        
        // Show results screen
        gameScreen.classList.add('hidden');
        resultsScreen.classList.remove('hidden');
    }
    
    // Share results
    function shareResults() {
        const completedWords = wordHistory.filter(w => w.completed).length;
        const totalWords = wordHistory.length;
        const completionRate = Math.round((completedWords / totalWords) * 100);
        
        const shareText = `I scored ${score} points in the Sustainability Word Challenge! I completed ${completedWords}/${totalWords} words (${completionRate}%). Can you beat my score? #SustainabilityChallenge`;
        
        // Try to use Web Share API if available
        if (navigator.share) {
            navigator.share({
                title: 'Sustainability Word Challenge Results',
                text: shareText,
                url: window.location.href
            })
            .catch(error => {
                console.error('Error sharing:', error);
                fallbackShare();
            });
        } else {
            fallbackShare();
        }
        
        // Fallback to clipboard
        function fallbackShare() {
            navigator.clipboard.writeText(shareText)
                .then(() => {
                    showToast('Results copied to clipboard!');
                })
                .catch(err => {
                    console.error('Failed to copy text: ', err);
                    showToast('Could not share results');
                });
        }
    }
});