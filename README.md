## 🎯 Project Description

StudySync revolutionizes collaborative learning by addressing the critical problem of student isolation and ineffective study habits in higher education. Our digital platform intelligently matches students with compatible study partners and facilitates seamless collaboration through virtual study rooms with real-time progress tracking.

### 🔍 Market Need
- **73%** of students report feeling isolated in their studies
- **68%** struggle with maintaining consistent study schedules  
- **82%** have experienced unproductive study groups due to mismatched learning styles
- Traditional study group formation is time-consuming and often unsuccessful

### 💡 Project Value Proposition
- **40% increase** in study effectiveness through AI-matched partnerships
- **Reduces student dropout rates** by providing consistent peer support and accountability
- **Saves 3+ hours weekly** typically spent on coordinating study groups
- **Improves academic outcomes** through structured collaborative learning

## 👥 Target Users

### 🎓 Primary Users

**University Students (18-25)**
- Seeking compatible study partners and structured learning environments
- Need accountability and motivation for consistent study habits
- Want to improve academic performance through peer collaboration

**Graduate Students (22-30)**
- Require specialized study groups for complex subjects
- Need flexible scheduling for work-study balance
- Seek professional networking opportunities

**Online Learners (18-45)**
- Lack peer interaction in remote learning environments
- Need virtual collaboration tools and community connection
- Struggle with motivation and accountability in isolated settings

### 🏫 Secondary Users

**Educational Institutions**
- Want to improve student retention and academic performance
- Seek data insights on student engagement and collaboration patterns
- Need tools to facilitate peer learning at scale

**Study Centers & Libraries**
- Looking to enhance their services with digital collaboration tools
- Want to track and optimize study space utilization
- Seeking to create more engaging learning environments

## 🚀 How to Run the Project

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- PostgreSQL
- Redis
- Docker (optional)
- Git

### Technical Requirements
- **Frontend**: React.js, responsive design
- **Backend**: Node.js, RESTful API
- **Database**: PostgreSQL for user data, Redis for sessions
- **Real-time**: Socket.io for live collaboration
- **AI/ML**: Python microservices for matching algorithm.
- **Docker Containerization**: Provides a consistent and isolated environment for all application components,

### Installation & Setup

Clone the repository:
   ```bash
   git clone https://github.com/KinyanjuiC/studysync.git
   cd studysync
   ```

#### 1. Configure Environment Variables

Copy the example environment files and update them with your configuration:

```bash
cd studysyncV2
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cp ai-microservice/.env.example ai-microservice/.env
```
- Update each `.env` file with your database credentials, Redis URL, JWT secrets, and any API keys.

#### 2. Set Up the Database

- Make sure PostgreSQL is running.
- Create the required database (e.g., `studysync`) and run the schema:

```bash
psql -U your_db_user -c "CREATE DATABASE studysync;"
psql -U your_db_user -d studysync -f backend/db.sql
```

#### 3. Start Redis

Start your Redis server (locally or via Docker):

```bash
redis-server
# or using Docker
docker run -p 6379:6379 redis
```

#### 4. Install Backend Dependencies

```bash
cd backend
npm install
```

#### 5. Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

#### 6. Install AI Microservice Dependencies

```bash
cd ../ai-microservice
pip install -r requirements.txt
```

#### 7. Run the Services

**Start the backend:**
```bash
cd ../backend
npm start
```

**Start the frontend:**
```bash
cd ../frontend
npm start
```

**Start the AI microservice:**
```bash
cd ../ai-microservice
python app.py
```

#### 8. (Optional) Using Docker

You can run the entire stack with Docker Compose for easier setup. From the project root:

```bash
docker-compose up --build
```

---

You should now be able to access the platform at `http://localhost:3000` (or the port specified in your frontend configuration).

For any issues, check the logs of each service and ensure all environment variables and database connections are properly configured.




## 👨‍💻 Team Members

| Role | Name | GitHub |
|------|------|--------|
| **Project Lead** | Collins Kimani | [@KinyanjuiC](https://github.com/KinyanjuiC) 
| **Collaborator** | Cynthia Njeri | [@cynthia-njeri](https://github.com/cynthijeri) 

## 📅 Project Timeline✅

### Phase 1: Research & Foundation (Weeks 1-2) 
- [x] Comprehensive market research and validation
- [x] User persona development and pain point analysis
- [x] Technical architecture design and planning
- [x] GitHub repository setup and documentation
- [x] Competitive analysis and positioning strategy

### Phase 2: MVP Development (Weeks 3-6)
- [x] User authentication and profile management system
- [x] Core AI matching algorithm implementation
- [x] Basic virtual study room with video/audio capabilities
- [x] Database schema design and implementation
- [x] RESTful API development for core features

### Phase 3: Advanced Features (Weeks 7-10)
- [x] Enhanced AI matching with learning style analysis
- [x] Personalized study scheduling and calendar integration
- [x] Progress tracking and analytics dashboard
- [x] Real-time notification system
- [x] Mobile-responsive design optimization

### Phase 4: Testing & Launch Preparation (Weeks 11-12)
- [x] Comprehensive user testing and feedback integration
- [x] Performance optimization and scalability improvements

## 📊 Project Management

### 📋 Project Board
[**View our detailed project board**](https://github.com/users/KinyanjuiC/projects/2) for real-time task tracking, sprint planning, and progress updates.

## 📚 Documentation

| Document | Description | Status |
|----------|-------------|---------|
| [Market Research Report](docs/market_research_report.pdf) | Comprehensive market analysis and validation | ✅ Complete |
| [Data Gathering Summary](docs/data_gathering_summary.pdf) | Primary and secondary research findings | ✅ Complete |
| [Requirements Document](docs/requirements_document.md) | Functional and technical requirements | ✅ Complete |




