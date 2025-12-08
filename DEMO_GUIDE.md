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
Role |         Email            |Password
Owner (Admin):owner@example.com Psassword: ownerpass

Doctor: doctor@example.com Password: doctorpass

Patient (Emma): emma.parent@example.com Password: patient1

Patient (Liam)
: liam.parent@example.com
  Password: patient2


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

### Test Chat Endpoint
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "What is the correct acetaminophen dose for a 25-pound toddler?", "session_id": "demo-001"}'
```

### Test Streaming Chat
```bash
curl -X POST http://localhost:8000/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"query": "What are the signs of an ear infection in toddlers?", "session_id": "demo-001"}'
```

### Test Feedback Endpoint
```bash
# Submit positive feedback
curl -X POST http://localhost:8000/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "conversation_id": "demo-001",
    "message_index": 1,
    "question": "What is the correct acetaminophen dose for a 25-pound toddler?",
    "answer": "For a 25-pound toddler, the recommended acetaminophen dose is...",
    "rating": "up",
    "timestamp": "2024-12-03T10:00:00Z"
  }'

# Submit negative feedback
curl -X POST http://localhost:8000/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "conversation_id": "demo-002",
    "message_index": 1,
    "question": "Can I give my child adult medication?",
    "answer": "Some response that was not helpful...",
    "rating": "down",
    "timestamp": "2024-12-03T10:05:00Z"
  }'

# Get all feedback
curl http://localhost:8000/feedback
```

### Test Health Endpoint
```bash
curl http://localhost:8000/health
```

### Test EHR Endpoints
```bash
# Get all patients
curl http://localhost:8000/ehr/patients

# Get specific patient
curl http://localhost:8000/ehr/patients/P001

# Search patients
curl "http://localhost:8000/ehr/patients/search?query=emma"
```

### Test Appointments
```bash
# Get appointments
curl http://localhost:8000/appointments

# Get appointments for specific patient
curl http://localhost:8000/appointments/patient/P001
```

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
- [ ] HIPAA Compliance dashboard accessible (owner only)

---

## 🛡️ HIPAA Compliance Demo

### Accessing the Compliance Dashboard

1. Login as **owner** (`owner@example.com` / `ownerpass`)
2. Click **"HIPAA Compliance"** in the sidebar
3. View the compliance dashboard

### Demo the Violation Detection

1. Click **"Generate Sample Events (Demo)"** button
2. Show the **Summary Cards**:
   - Total Events count
   - Violations detected (highlighted in red)
   - Active Users today
   - Compliance Status

3. Show **Violations by Severity**:
   - Critical (red) - Most severe, immediate action needed
   - High (orange) - Serious concern
   - Medium (yellow) - Needs review
   - Low (blue) - Minor concerns

4. Click through the **Tabs**:
   - **Overview** - Recent activity feed
   - **Violations** - All detected violations with details
   - **Audit Log** - Full table of all PHI access events

### Types of Violations Detected

| Violation | When It Triggers |
|-----------|------------------|
| **Unauthorized Access** | Invalid credentials or permissions |
| **After-Hours Access** | PHI access outside 7 AM - 7 PM |
| **Bulk Data Access** | Accessing 10+ patients in 10 minutes |
| **Excessive Queries** | More than 20 accesses per hour |
| **Cross-Patient Access** | Patient viewing another patient's data |

### What Gets Logged

Every PHI access is automatically tracked:
- **Who** accessed the data (user email, role)
- **What** was accessed (patient ID, record type)
- **When** (timestamp)
- **Where** (IP address in production)
- **Whether** it was a violation

### API Endpoints (Admin Only)

```bash
# Get compliance summary
curl http://localhost:8000/compliance/summary \
  -H "Authorization: Bearer <admin_token>"

# Get all violations
curl http://localhost:8000/compliance/violations \
  -H "Authorization: Bearer <admin_token>"

# Get full audit log
curl http://localhost:8000/compliance/audit-log \
  -H "Authorization: Bearer <admin_token>"

# Get access log for specific patient
curl http://localhost:8000/compliance/patient/P001/access-log \
  -H "Authorization: Bearer <admin_token>"
```

---

## 🚀 Production Implementation Notes

For production deployment, the HIPAA system needs:

1. **Database Storage** - Replace in-memory with PostgreSQL
2. **Immutable Logs** - Append-only tables with triggers
3. **Email Alerts** - Notify on critical violations
4. **6-Year Retention** - HIPAA requirement
5. **Encryption** - AES-256 at rest, TLS 1.3 in transit

See `README.md` → "HIPAA Compliance Implementation" section for full details.
