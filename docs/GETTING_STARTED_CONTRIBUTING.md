# Getting Started as a Contributor

Welcome to BetterSEQTA+! 🎉 This guide will walk you through making your first contribution, even if you're completely new to the project.

## Table of Contents

- [Before You Start](#before-you-start)
- [Your First 30 Minutes](#your-first-30-minutes)
- [Making Your First Contribution](#making-your-first-contribution)
- [Types of Contributions](#types-of-contributions)
- [Finding Something to Work On](#finding-something-to-work-on)
- [Development Workflow](#development-workflow)
- [Getting Help](#getting-help)

## Before You Start

### What You'll Need
- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **Git** - [Download here](https://git-scm.com/)
- **A code editor** - We recommend [VS Code](https://code.visualstudio.com/)
- **A Chromium browser** (Chrome, Edge, Brave) for testing (recommended, however you can use firefox although it requires being built every time you make a change)

### Helpful Background (but not required!)
- Basic JavaScript/TypeScript knowledge
- Some familiarity with HTML/CSS
- Understanding of browser extensions (we'll teach you!)

**Don't worry if you're missing some of these!** We're happy to help you learn. 🤗

## Your First 30 Minutes

Let's get you up and running quickly:

### 1. Get the Code (3 minutes)
```bash
# Fork the repository on GitHub first, then:
git clone https://github.com/YOUR_USERNAME/BetterSEQTA-plus.git
cd BetterSEQTA-plus
```

### 2. Install Dependencies (3 minutes)
```bash
npm install --legacy-peer-deps
```

### 3. Start Development Server (2 minutes)
```bash
npm run dev
```

### 4. Load Extension in Browser (4 minutes)
1. Open Chrome and go to `chrome://extensions`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `dist` folder in your project
5. Visit a SEQTA Learn page to see BetterSEQTA+ in action!

### 5. Make a Tiny Change (5 minutes)
Let's prove everything works:
1. Open `src/SEQTA.ts`
2. Find the line that says `"[BetterSEQTA+] Successfully initialised"`
3. Change it to `"[BetterSEQTA+] Successfully initialised - Hello [YOUR_NAME]!"`
4. Save the file
5. Go to `chrome://extensions`, click the refresh icon on BetterSEQTA+
6. Refresh a SEQTA page and check the browser console (F12) - you should see your message!

### 6. Reset Your Change (3 minutes)
```bash
git checkout -- src/SEQTA.ts
```

**Congratulations! 🎉 You've successfully set up BetterSEQTA+ for development!**

## Making Your First Contribution

### Easy First Contributions

Here are some great starter contributions:

1. **Fix a typo in documentation** - Super easy and always appreciated!
2. **Improve error messages** - Make them more helpful
3. **Add comments to code** - Help other contributors understand
4. **Create a simple plugin** - Follow our plugin guide
5. **Fix a bug you found** - If you found a bug, fix it!

### Step-by-Step: Your First Pull Request

#### Step 1: Pick an Issue
- Go to our [Issues page](https://github.com/BetterSEQTA/BetterSEQTA-plus/issues)
- Look for labels like:
  - `good first issue` - Perfect for beginners
  - `help wanted` - We'd love help with these
  - `documentation` - Improve our docs
  - `bug` - Fix something broken

#### Step 2: Claim the Issue
Comment on the issue saying "I'd like to work on this!" We'll assign it to you.

#### Step 3: Create a Branch
```bash
git checkout -b fix-issue-123  # Replace 123 with the issue number
```

#### Step 4: Make Your Changes
- Follow the patterns you see in existing code
- Test your changes thoroughly
- Keep changes focused and small

#### Step 5: Test Everything
```bash
# Test the extension still loads
npm run dev

# Test in browser
# 1. Reload extension at chrome://extensions
# 2. Visit SEQTA page
# 3. Verify everything still works
```

#### Step 6: Commit Your Changes
```bash
git add .
git commit -m "Fix issue #123: Brief description of what you fixed"
```

#### Step 7: Push and Create Pull Request
```bash
git push origin fix-issue-123
```

Then go to GitHub and create a pull request with:
- **Clear title**: "Fix issue #123: Brief description"
- **Description**: Explain what you changed and why
- **Testing**: Describe how you tested it

## Types of Contributions

### 🐛 Bug Fixes
- Fix broken features
- Improve error handling
- Resolve compatibility issues

**Example**: "The theme selector doesn't work on Firefox"

### ✨ New Features
- Add new plugins
- Enhance existing functionality
- Improve user experience

**Example**: "Add keyboard shortcuts for common actions"

### 📚 Documentation
- Fix typos and unclear explanations
- Add examples and tutorials
- Improve code comments

**Example**: "Add more examples to the plugin guide"

### 🎨 Design & UI
- Improve the settings interface
- Make things more user-friendly
- Add animations and polish

**Example**: "Make the theme creator more intuitive"

### 🔧 Technical Improvements
- Refactor code for clarity
- Add tests
- Improve performance

**Example**: "Simplify the plugin loading logic"

## Finding Something to Work On

### Browse Issues by Label
- [`good first issue`](https://github.com/BetterSEQTA/BetterSEQTA-plus/labels/good%20first%20issue) - Perfect for beginners
- [`help wanted`](https://github.com/BetterSEQTA/BetterSEQTA-plus/labels/help%20wanted) - We need help with these
- [`documentation`](https://github.com/BetterSEQTA/BetterSEQTA-plus/labels/documentation) - Improve our docs
- [`bug`](https://github.com/BetterSEQTA/BetterSEQTA-plus/labels/bug) - Fix something broken
- [`enhancement`](https://github.com/BetterSEQTA/BetterSEQTA-plus/labels/enhancement) - Add new features

### Create Your Own Issue
Found a bug or have an idea? Create an issue first to discuss it!

### Plugin Ideas
Want to create a plugin? Here are some ideas:
- **Study Timer**: Track study time across SEQTA pages
- **Grade Tracker**: Better visualization of grades over time
- **Quick Notes**: Add notes to any SEQTA page
- **Homework Reminder**: Smart notifications for upcoming due dates
- **Custom Shortcuts**: User-defined keyboard shortcuts

## Development Workflow

### Daily Development
```bash
# Start working
git pull origin main
npm run dev

# Make changes, test, commit
git add .
git commit -m "Descriptive commit message"

# Push when ready
git push origin your-branch-name
```

### Before Submitting PR
1. **Test thoroughly** - Make sure nothing breaks
2. **Check console** - No new errors
3. **Test in different browsers** - Chrome and Firefox
4. **Update documentation** - If you changed how something works

### Code Style
- Use TypeScript where possible
- Follow existing naming conventions
- Add comments for complex logic
- Keep functions small and focused

## Getting Help

### Stuck? Here's How to Get Unstuck

1. **Check the docs** - [Architecture guide](./ARCHITECTURE.md) explains everything
2. **Search existing issues** - Someone might have had the same problem
3. **Ask in Discord** - Our community is super helpful
4. **Create an issue** - If you found a bug or need help

### Discord Community
Join our [Discord server](https://discord.gg/YzmbnCDkat) for:
- Real-time help and discussion
- Collaboration on features
- Sharing ideas and feedback
- Getting to know the community

### Code Review Process
- All contributions need code review
- We'll provide helpful feedback
- Don't worry about making mistakes - we're here to help!
- Reviews usually happen within 24-48 hours

## Common Questions

**Q: I'm new to browser extensions. Is this too advanced for me?**
A: Not at all! We have lots of beginner-friendly issues, and our plugin system makes it easy to add features without understanding all the browser extension complexities.

**Q: How long does it take to get my first PR merged?**
A: For simple fixes, usually 1-3 days. For larger features, it might take a week or two as we discuss the best approach.

**Q: I made a mistake in my PR. What do I do?**
A: No worries! Just push more commits to the same branch and they'll be added to your PR automatically.

**Q: Can I work on multiple issues at once?**
A: It's better to focus on one issue at a time, especially when starting out. This makes code review easier and reduces conflicts.

**Q: What if I start working on something and get stuck?**
A: Ask for help! Create a draft PR with what you have so far, and we'll help you figure out the next steps.

## Recognition

All contributors get:
- Recognition in our README
- Contributor badge in Discord
- Our eternal gratitude! 🙏

Significant contributors may also get:
- Special Discord roles
- Input on project direction
- Maintainer status

## Next Steps

Ready to contribute? Here's what to do:

1. ✅ **Set up your development environment** (follow the 30-minute guide above)
2. 🔍 **Find an issue to work on** (check the "good first issue" label)
3. 💬 **Join our Discord** and introduce yourself
4. 🚀 **Make your first contribution** and submit a PR

Remember: **Every expert was once a beginner!** We're excited to help you learn and grow as a contributor. Welcome to the team! 🎉

---

*Questions? Suggestions for improving this guide? Open an issue or message us on Discord!* 