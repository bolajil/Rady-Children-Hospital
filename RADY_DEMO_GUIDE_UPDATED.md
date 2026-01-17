# Rady Children's GenAI - Demo Guide

## Quick Start Commands

### Start Backend (Terminal 1)
```bash
cd ~/.gemini/antigravity/scratch/rady-genai/backend
source venv/Scripts/activate  # Windows Git Bash
python -m uvicorn app.main:app --reload --port 8000
```

### Start Frontend (Terminal 2)
```bash
cd ~/.gemini/antigravity/scratch/rady-genai/frontend
npm run dev
```

### URLs
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

---

## Demo Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Owner (Admin) | owner@example.com | ownerpass |
| Doctor | doctor@example.com | doctorpass |
| Patient (Emma) | emma.parent@example.com | patient1 |
| Patient (Liam) | liam.parent@example.com | patient2 |

**Alternative Credentials:**

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@radychildrens.org | admin123 |
| Doctor | dr.smith@radychildrens.org | doctor123 |
| Nurse | nurse.jones@radychildrens.org | nurse123 |

---

## Pediatric Medical Questions for Demo

### Category 1: Common Childhood Illnesses

1. **Fever Management**
   ```
   What is the recommended treatment for a 3-year-old with a fever of 102°F?
   ```

2. **Ear Infections**
   ```
   What are the signs and symptoms of an ear infection in toddlers?
   ```

3. **Respiratory Issues**
   ```
   When should a child with croup be brought to the emergency room?
   ```

4. **Stomach Flu**
   ```
   How do I prevent dehydration in a 5-year-old with vomiting and diarrhea?
   ```

5. **Strep Throat**
   ```
   What are the typical symptoms of strep throat in children vs. viral sore throat?
   ```

### Category 2: Medication & Dosing

6. **Tylenol Dosing**
   ```
   What is the correct acetaminophen dose for a 25-pound toddler?
   ```

7. **Antibiotic Questions**
   ```
   How long should a child take amoxicillin for an ear infection?
   ```

8. **Drug Interactions**
   ```
   Can I give my child ibuprofen and acetaminophen together?
   ```

9. **Allergy Medication**
   ```
   What antihistamines are safe for children under 2 years old?
   ```

10. **Asthma Medication**
    ```
    When should a child use their rescue inhaler vs. daily controller medication?
    ```

### Category 3: Growth & Development

11. **Developmental Milestones**
    ```
    What developmental milestones should a 12-month-old have reached?
    ```

12. **Growth Concerns**
    ```
    My 4-year-old is in the 5th percentile for height. When should I be concerned?
    ```

13. **Speech Delay**
    ```
    How many words should a 2-year-old be able to say?
    ```

14. **Sleep Requirements**
    ```
    How many hours of sleep does a 7-year-old need per night?
    ```

15. **Feeding Issues**
    ```
    When can I introduce peanut butter to my infant?
    ```

### Category 4: Emergency & Urgent Care

16. **Head Injuries**
    ```
    What are the warning signs of a concussion in a child after hitting their head?
    ```

17. **Allergic Reactions**
    ```
    What are the signs of anaphylaxis in children and when to use an EpiPen?
    ```

18. **Breathing Emergencies**
    ```
    What should I do if my child is choking on food?
    ```

19. **Burns**
    ```
    How should I treat a minor burn on my toddler's hand?
    ```

20. **Broken Bones**
    ```
    How can I tell if my child's arm is broken vs. just bruised?
    ```

### Category 5: Preventive Care & Vaccines

21. **Vaccination Schedule**
    ```
    What vaccines does my child need at their 4-year well-child visit?
    ```

22. **Flu Prevention**
    ```
    At what age can a child get the flu vaccine?
    ```

23. **COVID-19**
    ```
    What are the COVID-19 vaccine recommendations for children under 5?
    ```

24. **Vision Screening**
    ```
    When should my child have their first eye exam?
    ```

25. **Dental Care**
    ```
    When should I start brushing my baby's teeth?
    ```

### Category 6: Chronic Conditions

26. **Diabetes Management**
    ```
    What are the signs of low blood sugar in a diabetic child?
    ```

27. **Asthma Care**
    ```
    What is an asthma action plan and what should it include?
    ```

28. **ADHD**
    ```
    What are the non-medication treatments for ADHD in children?
    ```

29. **Food Allergies**
    ```
    How do I create an emergency action plan for my child with a peanut allergy?
    ```

30. **Eczema**
    ```
    What is the best moisturizing routine for a child with severe eczema?
    ```

---

## Backend API Test Commands

> **Tip:** Use the Swagger UI at http://localhost:8000/docs to test endpoints with the JSON bodies below.

### Test Chat Endpoint
**Endpoint:** `POST /chat`

**JSON Body:**
```json
{
  "query": "What is the correct acetaminophen dose for a 25-pound toddler?",
  "session_id": "demo-001"
}
```

**curl (Linux/Mac):**
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "What is the correct acetaminophen dose for a 25-pound toddler?", "session_id": "demo-001"}'
```

---

### Test Streaming Chat
**Endpoint:** `POST /chat/stream`

Stream the assistant's response incrementally. This is a best-effort stream:
- If conversation memory is available, it's used as in the `/chat` endpoint.
- If the underlying LLM/agent doesn't support server-side streaming via callbacks in the current environment, we chunk the final text to simulate token streaming.

**JSON Body:**
```json
{
  "query": "What are the signs of an ear infection in toddlers?",
  "session_id": "demo-001"
}
```

**curl (Linux/Mac):**
```bash
curl -X POST http://localhost:8000/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"query": "What are the signs of an ear infection in toddlers?", "session_id": "demo-001"}'
```

---

### Test Feedback Endpoint
**Endpoint:** `POST /feedback`

**JSON Body (Positive Feedback):**
```json
{
  "conversation_id": "demo-001",
  "message_index": 1,
  "question": "What is the correct acetaminophen dose for a 25-pound toddler?",
  "answer": "For a 25-pound toddler, the recommended acetaminophen dose is...",
  "rating": "up",
  "timestamp": "2024-12-03T10:00:00Z"
}
```

**JSON Body (Negative Feedback):**
```json
{
  "conversation_id": "demo-002",
  "message_index": 1,
  "question": "Can I give my child adult medication?",
  "answer": "Some response that was not helpful...",
  "rating": "down",
  "timestamp": "2024-12-03T10:05:00Z"
}
```

**Get All Feedback:** `GET /feedback` (no body needed)

---

### Test Health Endpoint
**Endpoint:** `GET /health` (no body needed)

---

### Test EHR Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/ehr/patients` | Get all patients |
| GET | `/ehr/patients/P001` | Get specific patient |
| GET | `/ehr/patients/search?query=emma` | Search patients |

---

### Test Appointments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/appointments` | Get all appointments |
| GET | `/appointments/patient/P001` | Get appointments for patient |

---

## Sample Patient Data for Demo

### Patient 1: Emma Thompson
- **ID**: P001
- **Age**: 8 years
- **Conditions**: Asthma, seasonal allergies
- **Medications**: Albuterol inhaler, Zyrtec
- **Demo Question**: "What asthma triggers should Emma's parents watch for?"

### Patient 2: Liam Rodriguez
- **ID**: P002
- **Age**: 3 years
- **Conditions**: Frequent ear infections
- **Medications**: Currently on amoxicillin
- **Demo Question**: "When should Liam's ear infection symptoms improve with antibiotics?"

### Patient 3: Sophia Chen
- **ID**: P003
- **Age**: 6 months
- **Conditions**: Eczema
- **Medications**: Hydrocortisone cream
- **Demo Question**: "What foods might trigger Sophia's eczema flares?"

### Patient 4: Noah Williams
- **ID**: P004
- **Age**: 10 years
- **Conditions**: Type 1 Diabetes
- **Medications**: Insulin
- **Demo Question**: "What should Noah's teacher know about managing his diabetes at school?"

### Patient 5: Olivia Martinez
- **ID**: P005
- **Age**: 5 years
- **Conditions**: Peanut allergy
- **Medications**: EpiPen
- **Demo Question**: "What steps should be taken if Olivia accidentally eats something with peanuts?"

---

## Frontend Test Scenarios

### Scenario 1: Basic Chat Flow
1. Login as doctor (dr.smith@radychildrens.org)
2. Click "New Chat"
3. Ask: "What is the recommended treatment for a 3-year-old with a fever of 102°F?"
4. Wait for response
5. Click thumbs up to rate positively
6. Verify rating is saved

### Scenario 2: Quick Actions
1. Click each quick action button on empty chat
2. Verify input field populates with query
3. Submit and verify response

### Scenario 3: Conversation Memory
1. Ask: "My patient is a 5-year-old boy with asthma"
2. Follow up: "What triggers should his parents watch for?"
3. Verify the AI remembers the context (5-year-old, asthma)

### Scenario 4: Copy & Rate
1. Get a response from the AI
2. Click copy button - verify toast/feedback
3. Click thumbs down - verify it turns red
4. Click thumbs up - verify it switches to green
5. Click thumbs up again - verify it toggles off

### Scenario 5: Mobile Responsiveness
1. Open Chrome DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Select iPhone 12 Pro
4. Test sidebar toggle
5. Test chat input
6. Verify all buttons are touch-friendly (min 44px)

### Scenario 6: Error Handling
1. Stop the backend server
2. Try to send a message
3. Verify graceful error message appears
4. Restart backend
5. Verify chat works again

---

## Demo Script (5 minutes)

### Opening (30 sec)
"This is Rady Children's GenAI Assistant - an AI-powered tool to help healthcare providers quickly access medical information for pediatric care."

### Login Demo (30 sec)
1. Show login page with Rady branding
2. Login as dr.smith@radychildrens.org
3. Point out HIPAA compliance badge

### Chat Demo (2 min)
1. Click "New Chat"
2. Ask: "What is the correct acetaminophen dose for a 25-pound toddler?"
3. Show response streaming
4. Click thumbs up: "We collect feedback to continuously improve our AI"
5. Ask follow-up: "What if the fever doesn't go down?"
6. Point out: "The AI remembers context from our conversation"

### Quick Actions Demo (1 min)
1. Start new chat
2. Click "Check drug interactions"
3. Complete query: "...between ibuprofen and amoxicillin for a 6-year-old"
4. Show response

### Feedback System Demo (1 min)
1. Show thumbs up/down on a response
2. Explain: "This feedback trains the model over time"
3. If admin, show: "GET /feedback to see all collected feedback"

### Closing (30 sec)
"This tool helps providers give faster, more accurate care while maintaining HIPAA compliance and continuously learning from feedback."

---

## Troubleshooting

### Backend won't start
```bash
# Check if port 8000 is in use
netstat -ano | findstr :8000

# Kill process if needed
taskkill /PID <PID> /F
```

### Frontend won't start
```bash
# Check if port 3000 is in use
netstat -ano | findstr :3000

# Kill process if needed
taskkill /PID <PID> /F

# Clear Next.js cache
rm -rf .next
npm run dev
```

### API returns errors
```bash
# Check backend logs in terminal
# Verify OPENAI_API_KEY is set
echo $OPENAI_API_KEY

# Test backend directly
curl http://localhost:8000/health
```

### Login not working
1. Check backend is running on port 8000
2. Check browser console for CORS errors
3. Verify credentials match users.py

---

## Environment Variables Needed

### Backend (.env)
```
OPENAI_API_KEY=sk-your-key-here
```

### Frontend (.env.local)
```
BACKEND_URL=http://127.0.0.1:8000
```

---

## Success Criteria for Demo

- [ ] Login page loads with Rady branding
- [ ] User can login successfully
- [ ] Chat responds to medical questions
- [ ] Responses are medically appropriate for pediatrics
- [ ] Thumbs up/down buttons work
- [ ] Feedback is stored (check /feedback endpoint)
- [ ] Mobile view is functional
- [ ] No console errors
- [ ] HIPAA badge is visible

---

## Healthcare LLM Enhancement System

> **New Addition:** A complete RAG-based treatment planning system has been added to enhance the Rady GenAI capabilities.

### Documentation Files Added

| File | Location | Description |
|------|----------|-------------|
| `HEALTHCARE_LLM_KNOWLEDGE_BASE.md` | rady-genai/ | Complete 24KB guide for RAG + LLM healthcare system |
| `healthcare-llm-implementation/` | rady-genai/ | 6 Python implementation scripts |

### Implementation Steps

```powershell
# Navigate to implementation folder
cd ~/.gemini/antigravity/scratch/rady-genai/healthcare-llm-implementation

# Step 1: Generate synthetic patients (50 patients)
python 01_generate_patients.py

# Step 2: Create clinical guidelines
python 02_create_guidelines.py

# Step 3: Build RAG embeddings
python 03_build_rag.py

# Step 4: Generate treatment plans
python 04_orchestrator.py

# Step 5: Run safety guardrails
python 05_guardrails.py

# Step 6: Evaluate quality
python 06_evaluation.py
```

### Standalone Project Location
Full tested implementation is also available at:
```
C:\Users\bolaf\CascadeProjects\healthcare-llm-guide\
```

### Key Features
- **RAG Architecture:** Patient data stays in DB, not in model weights
- **Safety Guardrails:** 10 clinical safety rules
- **Evaluation Harness:** Measures guideline consistency, safety, completeness
- **Mock LLM Mode:** Works without API keys for testing
