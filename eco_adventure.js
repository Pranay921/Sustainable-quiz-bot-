document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const startScreen = document.getElementById('start-screen');
    const loadingScreen = document.getElementById('loading-screen');
    const gameScreen = document.getElementById('game-screen');
    const endingScreen = document.getElementById('ending-screen');
    const startBtn = document.getElementById('start-btn');
    const storyText = document.getElementById('story-text');
    const storyImage = document.getElementById('story-image');
    const choicesContainer = document.getElementById('choices-container');
    const ecoPointsElement = document.getElementById('eco-points');
    const currentChapterElement = document.getElementById('current-chapter');
    const hintBtn = document.getElementById('hint-btn');
    const restartBtn = document.getElementById('restart-btn');
    const finalEcoPointsElement = document.getElementById('final-eco-points');
    const endingMessageElement = document.getElementById('ending-message');
    const impactSummaryElement = document.getElementById('impact-summary');
    const playAgainBtn = document.getElementById('play-again-btn');
    const shareResultBtn = document.getElementById('share-result-btn');
    const hintModal = document.getElementById('hint-modal');
    const hintText = document.getElementById('hint-text');
    const closeModal = document.querySelector('.close-modal');

    // Game State
    let ecoPoints = 0;
    let currentChapter = 1;
    let currentScenario = null;
    let gameHistory = [];
    let scenariosData = [];
    let choiceSelected = false;

    // Event Listeners
    startBtn.addEventListener('click', startGame);
    hintBtn.addEventListener('click', showHint);
    restartBtn.addEventListener('click', restartGame);
    playAgainBtn.addEventListener('click', restartGame);
    shareResultBtn.addEventListener('click', shareResults);
    closeModal.addEventListener('click', () => {
        hintModal.classList.add('hidden');
        document.body.style.overflow = '';
    });

    // Close modal when clicking outside of it
    window.addEventListener('click', (e) => {
        if (e.target === hintModal) {
            hintModal.classList.add('hidden');
            document.body.style.overflow = '';
        }
    });

    // Start the game
    // Add this near the top of your file with other variable declarations
    let scenarios = [];
    let useFallbackScenarios = false;
    
    // Modify your startGame function to fetch scenarios
    function startGame() {
        startScreen.classList.add('hidden');
        loadingScreen.classList.remove('hidden');
        
        // Reset game state
        ecoPoints = 0;
        currentChapter = 1;
        gameHistory = [];
        ecoPointsElement.textContent = ecoPoints;
        currentChapterElement.textContent = currentChapter;
        
        // Fetch scenarios from the API
        fetch('/get_scenarios')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                scenarios = data;
                console.log('Loaded scenarios:', scenarios);
                
                // Simulate loading for better UX (minimum 1.5 seconds)
                setTimeout(() => {
                    loadingScreen.classList.add('hidden');
                    gameScreen.classList.remove('hidden');
                    loadScenario(1); // Start with the first scenario
                }, 1500);
            })
            .catch(error => {
                console.error('Error fetching scenarios:', error);
                // Fall back to local scenarios if API fails
                useFallbackScenarios = true;
                scenarios = getFallbackScenarios();
                
                setTimeout(() => {
                    loadingScreen.classList.add('hidden');
                    gameScreen.classList.remove('hidden');
                    loadScenario(1); // Start with the first scenario
                }, 1500);
            });
    }

    // Update your loadScenario function to use the fetched scenarios
    function loadScenario(scenarioId) {
        // Find the scenario with the matching ID
        currentScenario = scenarios.find(s => s.id === scenarioId);
        
        if (!currentScenario) {
            // If we can't find the scenario, end the game
            endGame();
            return;
        }
        
        // Update chapter indicator
        currentChapterElement.textContent = currentChapter;
        
        // Display scenario text
        storyText.innerHTML = currentScenario.description;
        
        // Clear previous choices
        choicesContainer.innerHTML = '';
        choiceSelected = false;
        
        // Create choice buttons
        currentScenario.choices.forEach(choice => {
            const choiceBtn = document.createElement('div');
            choiceBtn.className = 'choice-btn';
            choiceBtn.textContent = choice.text;
            
            choiceBtn.addEventListener('click', function() {
                if (!choiceSelected) {
                    makeChoice(choice, this);
                }
            });
            
            choicesContainer.appendChild(choiceBtn);
        });
        
        // Add scenario-specific background if available
        if (currentScenario.environment) {
            storyText.parentElement.classList.remove('forest-bg', 'ocean-bg', 'urban-bg', 'desert-bg');
            storyText.parentElement.classList.add(`${currentScenario.environment}-bg`);
        }
    }

    // Make sure you have a route in your Flask app to serve the eco_adventure.html file
    // Add this to your chatbot.py if it's not already there:
    // @app.route('/eco-adventure')
    // def eco_adventure():
    //     return send_from_directory('.', 'eco_adventure.html')

    // Handle player choice
    function makeChoice(choice, choiceElement) {
        choiceSelected = true;
        
        // Visual feedback for selection
        choiceElement.classList.add('selected');
        
        // Update eco points with animation
        if (choice.points) {
            const pointsChange = choice.points;
            ecoPoints += pointsChange;
            ecoPointsElement.textContent = ecoPoints;
            
            // Create points animation
            const pointsAnimation = document.createElement('div');
            pointsAnimation.className = 'points-animation';
            pointsAnimation.textContent = pointsChange > 0 ? `+${pointsChange}` : pointsChange;
            pointsAnimation.style.left = `${choiceElement.offsetLeft + choiceElement.offsetWidth / 2}px`;
            pointsAnimation.style.top = `${choiceElement.offsetTop}px`;
            document.body.appendChild(pointsAnimation);
            
            // Remove animation element after it completes
            setTimeout(() => {
                document.body.removeChild(pointsAnimation);
            }, 1500);
        }
        
        // Add to game history
        gameHistory.push({
            scenario: currentScenario.id,
            choice: choice.id,
            points: choice.points || 0
        });
        
        // Show feedback if available
        if (choice.feedback) {
            // Create toast notification for important feedback
            if (choice.points > 10 || choice.points < -10) {
                showToast(choice.points > 0 ? 
                    "Great choice for the environment!" : 
                    "That choice may harm the environment.");
            }
            
            setTimeout(() => {
                storyText.innerHTML = choice.feedback;
                choicesContainer.innerHTML = '';
                
                const continueBtn = document.createElement('div');
                continueBtn.className = 'choice-btn';
                continueBtn.textContent = 'Continue';
                continueBtn.addEventListener('click', () => {
                    currentChapter++;
                    
                    // Check if we've reached the chapter limit (10)
                    if (currentChapter > 10) {
                        endGame();
                    } else {
                        loadScenario(choice.next);
                    }
                });
                
                choicesContainer.appendChild(continueBtn);
            }, 1000); // Short delay for visual feedback
        } else {
            // Move directly to the next scenario after a short delay
            setTimeout(() => {
                currentChapter++;
                
                // Check if we've reached the chapter limit (10)
                if (currentChapter > 10) {
                    endGame();
                } else {
                    loadScenario(choice.next);
                }
            }, 1000);
        }
    }

    // Show hint for current scenario
    function showHint() {
        if (currentScenario && currentScenario.hint) {
            hintText.textContent = currentScenario.hint;
            hintModal.classList.remove('hidden');
            // Prevent background scrolling when modal is open
            document.body.style.overflow = 'hidden';
        }
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

    // Restart the game
    function restartGame() {
        ecoPoints = 0;
        currentChapter = 1;
        gameHistory = [];
        
        ecoPointsElement.textContent = ecoPoints;
        
        endingScreen.classList.add('hidden');
        startScreen.classList.remove('hidden');
        
        // Fetch new scenarios when restarting for variety
        startGame();
    }

    // End the game and show results
    function endGame() {
        gameScreen.classList.add('hidden');
        endingScreen.classList.remove('hidden');
        
        finalEcoPointsElement.textContent = ecoPoints;
        
        // Determine ending based on eco points
        let endingMessage, impactSummary;
        
        if (ecoPoints >= 80) {
            endingMessage = "Congratulations, Environmental Champion! Your choices have made a significant positive impact on the planet. Future generations will benefit from your wisdom and care for the environment.";
            impactSummary = `
                <h3>Your Environmental Impact:</h3>
                <div class="impact-meter">
                    <div class="impact-progress" style="width: 95%"></div>
                    <div class="impact-label">Excellent Impact</div>
                </div>
                <ul>
                    <li>You've helped reduce carbon emissions by an estimated 75%</li>
                    <li>Your actions have protected endangered species and their habitats</li>
                    <li>Communities are thriving with sustainable practices you've supported</li>
                    <li>Natural resources are being preserved for future generations</li>
                </ul>
                <div class="eco-badges">
                    <div class="badge earned">
                        🌍
                        <span class="badge-tooltip">Earth Protector</span>
                    </div>
                    <div class="badge earned">
                        🌱
                        <span class="badge-tooltip">Sustainability Expert</span>
                    </div>
                    <div class="badge earned">
                        🦋
                        <span class="badge-tooltip">Wildlife Guardian</span>
                    </div>
                </div>
            `;
        } else if (ecoPoints >= 50) {
            endingMessage = "Well done, Eco-Warrior! Your journey shows a strong commitment to environmental sustainability. While some challenges remain, your positive choices have helped create a better world.";
            impactSummary = `
                <h3>Your Environmental Impact:</h3>
                <div class="impact-meter">
                    <div class="impact-progress" style="width: 70%"></div>
                    <div class="impact-label">Good Impact</div>
                </div>
                <ul>
                    <li>You've contributed to a 45% reduction in pollution</li>
                    <li>Several ecosystems are recovering thanks to your efforts</li>
                    <li>Renewable energy adoption has increased in your region</li>
                    <li>Your community is more environmentally conscious</li>
                </ul>
                <div class="eco-badges">
                    <div class="badge earned">
                        🌍
                        <span class="badge-tooltip">Earth Protector</span>
                    </div>
                    <div class="badge earned">
                        🌱
                        <span class="badge-tooltip">Sustainability Expert</span>
                    </div>
                    <div class="badge">
                        🦋
                        <span class="badge-tooltip">Wildlife Guardian</span>
                    </div>
                </div>
            `;
        } else if (ecoPoints >= 30) {
            endingMessage = "You're on the right path as an Environmental Ally. While some of your choices could have been more eco-friendly, you've shown awareness of environmental issues and made some positive impacts.";
            impactSummary = `
                <h3>Your Environmental Impact:</h3>
                <div class="impact-meter">
                    <div class="impact-progress" style="width: 40%"></div>
                    <div class="impact-label">Moderate Impact</div>
                </div>
                <ul>
                    <li>You've helped reduce waste by about 25%</li>
                    <li>Some wildlife populations have stabilized with your help</li>
                    <li>Your community has taken small steps toward sustainability</li>
                    <li>There's room for improvement, but you've made a difference</li>
                </ul>
                <div class="eco-badges">
                    <div class="badge earned">
                        🌍
                        <span class="badge-tooltip">Earth Protector</span>
                    </div>
                    <div class="badge">
                        🌱
                        <span class="badge-tooltip">Sustainability Expert</span>
                    </div>
                    <div class="badge">
                        🦋
                        <span class="badge-tooltip">Wildlife Guardian</span>
                    </div>
                </div>
            `;
        } else {
            endingMessage = "Your journey as an Environmental Observer has ended. Many of your choices didn't prioritize ecological sustainability. Consider how different decisions might lead to a healthier planet in the future.";
            impactSummary = `
                <h3>Your Environmental Impact:</h3>
                <div class="impact-meter">
                    <div class="impact-progress" style="width: 15%"></div>
                    <div class="impact-label">Limited Impact</div>
                </div>
                <ul>
                    <li>Environmental degradation continues in many areas</li>
                    <li>Wildlife populations remain threatened</li>
                    <li>Pollution levels remain high in your region</li>
                    <li>There's significant opportunity to make more eco-friendly choices</li>
                </ul>
                <div class="eco-badges">
                    <div class="badge">
                        🌍
                        <span class="badge-tooltip">Earth Protector</span>
                    </div>
                    <div class="badge">
                        🌱
                        <span class="badge-tooltip">Sustainability Expert</span>
                    </div>
                    <div class="badge">
                        🦋
                        <span class="badge-tooltip">Wildlife Guardian</span>
                    </div>
                </div>
            `;
        }
        
        endingMessageElement.textContent = endingMessage;
        impactSummaryElement.innerHTML = impactSummary;
        
        // Animate impact meter
        setTimeout(() => {
            const impactProgress = document.querySelector('.impact-progress');
            if (impactProgress) {
                impactProgress.style.width = impactProgress.style.width;
            }
        }, 100);
    }

    // Share results on social media or copy to clipboard
    function shareResults() {
        const text = `I scored ${ecoPoints} Eco-Points in the Eco-Adventure game! My environmental choices led me to become a ${getPlayerTitle()}. How eco-friendly are your choices? Play now and find out!`;
        
        if (navigator.share) {
            navigator.share({
                title: 'My Eco-Adventure Results',
                text: text,
                url: window.location.href
            }).catch(err => {
                console.error('Error sharing:', err);
                copyToClipboard(text);
            });
        } else {
            copyToClipboard(text);
        }
    }

    // Get player title based on score
    function getPlayerTitle() {
        if (ecoPoints >= 80) return "Environmental Champion";
        if (ecoPoints >= 50) return "Eco-Warrior";
        if (ecoPoints >= 30) return "Environmental Ally";
        return "Environmental Observer";
    }

    // Copy text to clipboard
    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('Result copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy text:', err);
            alert('Failed to copy to clipboard. Please share manually.');
        });
    }

    // Fallback scenarios in case server fetch fails
    function getFallbackScenarios() {
        return [
            {
                id: 1,
                description: "<p>You are hiking in a forest when you find a turtle tangled in plastic waste. The turtle appears to be struggling and in distress.</p><p>What do you do?</p>",
                environment: "forest",
                hint: "Turtles can be injured by plastic waste. Consider both immediate help and long-term solutions.",
                choices: [
                    {
                        id: "1A",
                        text: "Remove the plastic carefully and release the turtle",
                        points: 10,
                        feedback: "You carefully remove the plastic without harming the turtle. It slowly moves away, free from the harmful debris. You feel good knowing you've directly helped a creature in need.",
                        next: 2
                    },
                    {
                        id: "1B",
                        text: "Ignore it and keep walking",
                        points: -5,
                        feedback: "You continue your hike, leaving the turtle struggling. As you walk away, you can't help but feel a sense of guilt knowing you could have helped.",
                        next: 2
                    },
                    {
                        id: "1C",
                        text: "Call a wildlife rescue team",
                        points: 5,
                        feedback: "You call a local wildlife rescue team. They thank you for reporting it and promise to send someone right away. You wait until they arrive to make sure the turtle gets help.",
                        next: 2
                    }
                ]
            },
            // Additional fallback scenarios would go here
            // For brevity, I've included just one scenario
            // In a real implementation, you would include all 10 scenarios
            {
                id: 2,
                description: "<p>You come across a small stream that's visibly polluted with trash and chemical runoff from a nearby facility.</p><p>How do you respond to this situation?</p>",
                environment: "ocean",
                hint: "Water pollution affects entire ecosystems. Think about both immediate and systemic solutions.",
                choices: [
                    {
                        id: "2A",
                        text: "Organize a community cleanup for the stream",
                        points: 15,
                        feedback: "You post about the polluted stream on social media and organize a weekend cleanup. Twenty people join you, and together you remove several bags of trash.",
                        next: 3
                    },
                    {
                        id: "2B",
                        text: "Report the pollution to environmental authorities",
                        points: 10,
                        feedback: "You document the pollution with photos and report it to the environmental protection agency. They thank you for the detailed report and promise to investigate.",
                        next: 3
                    },
                    {
                        id: "2C",
                        text: "Take a water sample to test it yourself",
                        points: 5,
                        feedback: "You collect a water sample in a clean container. Later, you use a home testing kit to confirm high levels of contaminants.",
                        next: 3
                    }
                ]
            },
            {
                id: 3,
                description: "<p>Your town is experiencing a severe drought. Water restrictions have been implemented, but you notice your neighbor using a sprinkler system daily.</p><p>What action do you take?</p>",
                environment: "urban",
                hint: "Water conservation during droughts is crucial. Consider both personal relationships and community needs.",
                choices: [
                    {
                        id: "3A",
                        text: "Politely talk to your neighbor about water conservation",
                        points: 10,
                        feedback: "You approach your neighbor kindly and share information about the drought's severity. They're receptive and agree to reduce their water usage.",
                        next: 4
                    },
                    {
                        id: "3B",
                        text: "Report them to local authorities for violating restrictions",
                        points: 5,
                        feedback: "You report the violation anonymously. A water conservation officer visits your neighbor, who receives a warning.",
                        next: 4
                    },
                    {
                        id: "3C",
                        text: "Leave an informational pamphlet about water conservation",
                        points: 7,
                        feedback: "You leave a friendly note with information about the drought and water-saving tips.",
                        next: 4
                    }
                ]
            },
            {
                id: 4,
                description: "<p>While shopping for groceries, you're deciding between conventional produce and organic options.</p><p>What do you choose?</p>",
                environment: "urban",
                hint: "Food choices have environmental impacts through pesticide use, transportation emissions, and supporting local economies.",
                choices: [
                    {
                        id: "4A",
                        text: "Buy the organic, locally grown produce",
                        points: 15,
                        feedback: "You choose the organic, local options. Though more expensive, you're supporting local farmers and reducing transportation emissions.",
                        next: 5
                    },
                    {
                        id: "4B",
                        text: "Buy the conventional, imported produce to save money",
                        points: -5,
                        feedback: "You opt for the cheaper conventional produce. While saving money, these foods traveled long distances, increasing carbon emissions.",
                        next: 5
                    },
                    {
                        id: "4C",
                        text: "Buy some organic items and some conventional ones",
                        points: 5,
                        feedback: "You compromise by purchasing organic versions of the 'dirty dozen' and conventional versions of other items.",
                        next: 5
                    }
                ]
            },
            {
                id: 5,
                description: "<p>You're planning a vacation and considering different transportation options. Your destination is about 500 miles away.</p><p>How do you choose to travel?</p>",
                environment: "urban",
                hint: "Different modes of transportation have varying carbon footprints.",
                choices: [
                    {
                        id: "5A",
                        text: "Fly there to save time",
                        points: -10,
                        feedback: "You choose to fly for convenience. Air travel produces significant carbon emissions per passenger.",
                        next: 6
                    },
                    {
                        id: "5B",
                        text: "Take a train or bus",
                        points: 15,
                        feedback: "You opt for public transportation. Trains and buses have much lower emissions per passenger than planes or private cars.",
                        next: 6
                    },
                    {
                        id: "5C",
                        text: "Drive your own car",
                        points: -5,
                        feedback: "You drive your gasoline-powered car. While more convenient than public transport, your solo car trip generates significant emissions.",
                        next: 6
                    }
                ]
            },
            {
                id: 6,
                description: "<p>You discover that a large corporation is planning to build a factory near a protected wetland area.</p><p>What action do you take?</p>",
                environment: "forest",
                hint: "This situation involves balancing economic benefits with environmental protection.",
                choices: [
                    {
                        id: "6A",
                        text: "Actively protest against the factory",
                        points: 10,
                        feedback: "You join local environmental groups in organizing protests. Your efforts gain media attention, putting pressure on the corporation.",
                        next: 7
                    },
                    {
                        id: "6B",
                        text: "Support the factory for economic growth",
                        points: -10,
                        feedback: "You advocate for the factory, prioritizing job creation. The factory is built, creating jobs, but pollution begins affecting the wetland.",
                        next: 7
                    },
                    {
                        id: "6C",
                        text: "Propose a compromise with stricter environmental regulations",
                        points: 15,
                        feedback: "You work with both environmentalists and the corporation to develop a plan that allows the factory with enhanced environmental protections.",
                        next: 7
                    }
                ]
            },
            {
                id: 7,
                description: "<p>You notice that your workplace has no recycling program and generates a lot of waste.</p><p>What do you do about this situation?</p>",
                environment: "urban",
                hint: "Organizational change often requires both individual action and system-level approaches.",
                choices: [
                    {
                        id: "7A",
                        text: "Start bringing your own reusable items but don't address the larger issue",
                        points: 5,
                        feedback: "You begin using a reusable water bottle, coffee mug, and lunch containers. Your colleagues notice your example.",
                        next: 8
                    },
                    {
                        id: "7B",
                        text: "Propose and help implement a comprehensive recycling program",
                        points: 15,
                        feedback: "You research recycling options, create a proposal, and present it to management. They approve your plan.",
                        next: 8
                    },
                    {
                        id: "7C",
                        text: "Complain about the waste problem to colleagues without taking action",
                        points: -5,
                        feedback: "You frequently mention the waste problem to coworkers but don't suggest solutions.",
                        next: 8
                    }
                ]
            },
            {
                id: 8,
                description: "<p>You're renovating your home and need to choose materials and appliances.</p><p>What do you prioritize?</p>",
                environment: "urban",
                hint: "Different aspects of home renovation have varying environmental impacts.",
                choices: [
                    {
                        id: "8A",
                        text: "Energy efficiency (better insulation, energy-efficient appliances)",
                        points: 15,
                        feedback: "You invest in proper insulation and Energy Star appliances. Your energy bills drop by 30%.",
                        next: 9
                    },
                    {
                        id: "8B",
                        text: "Water conservation (low-flow fixtures, efficient irrigation)",
                        points: 10,
                        feedback: "You install low-flow toilets, faucets, and showerheads, plus a rain barrel for garden irrigation.",
                        next: 9
                    },
                    {
                        id: "8C",
                        text: "Sustainable materials (reclaimed wood, low-VOC paint)",
                        points: 5,
                        feedback: "You choose eco-friendly materials like bamboo flooring, reclaimed wood, and non-toxic paint.",
                        next: 9
                    }
                ]
            },
            {
                id: 9,
                description: "<p>You discover an area in your community where illegal dumping has occurred.</p><p>How do you respond?</p>",
                environment: "urban",
                hint: "Illegal dumping can contaminate soil and water. Consider both cleanup and prevention.",
                choices: [
                    {
                        id: "9A",
                        text: "Report it to local authorities",
                        points: 10,
                        feedback: "You document the dumping site with photos and report it to environmental authorities.",
                        next: 10
                    },
                    {
                        id: "9B",
                        text: "Organize a community cleanup with proper safety measures",
                        points: 15,
                        feedback: "You contact local environmental groups for guidance, then organize a cleanup with proper safety equipment.",
                        next: 10
                    },
                    {
                        id: "9C",
                        text: "Clean it up yourself without special equipment",
                        points: -5,
                        feedback: "With good intentions but inadequate protection, you attempt to clean up the site.",
                        next: 10
                    }
                ]
            },
            {
                id: 10,
                description: "<p>You're considering how to reduce your carbon footprint through your diet.</p><p>What dietary change do you decide to make?</p>",
                environment: "urban",
                hint: "Food choices have significant environmental impacts. Animal products generally have higher carbon footprints than plant-based options.",
                choices: [
                    {
                        id: "10A",
                        text: "Become fully vegan (no animal products)",
                        points: 15,
                        feedback: "You transition to a completely plant-based diet. This choice significantly reduces your carbon footprint.",
                        next: 11
                    },
                    {
                        id: "10B",
                        text: "Adopt a vegetarian diet (no meat but still consume dairy and eggs)",
                        points: 10,
                        feedback: "You eliminate meat but continue eating dairy and eggs. This reduces your dietary carbon footprint substantially.",
                        next: 11
                    },
                    {
                        id: "10C",
                        text: "Become a 'flexitarian' (mostly plant-based with occasional meat)",
                        points: 5,
                        feedback: "You reduce meat consumption to once or twice a week and choose more plant-based meals.",
                        next: 11
                    }
                ]
            },
            {
                id: 11,
                description: "<p>This is the end of your eco-adventure journey. Your choices have shaped the environment around you.</p>",
                environment: "forest",
                hint: "Every environmental choice matters, both big and small.",
                choices: [
                    {
                        id: "11A",
                        text: "See your results",
                        points: 0,
                        next: 12
                    }
                ]
            }
        ];
    }
});