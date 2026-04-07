# Nurse Role Integration - Evaluation & Gap Analysis

## 📊 Current State Assessment

### Existing Roles
| Role | Backend | Frontend | Login Redirect | Quick Actions |
|------|---------|----------|----------------|---------------|
| `owner` | ✅ | ✅ | `/admin` | N/A |
| `doctor` | ✅ | ✅ | `/ehr` | 6 actions |
| `patient` | ✅ | ✅ | `/appointments` | 4 actions |
| **`nurse`** | ❌ Missing | ❌ Missing | ❌ None | ❌ None |

---

## 🔴 CRITICAL ISSUES (Must Fix)

### Issue #1: Role Enum Missing Nurse
**File:** `@backend/app/models/user.py:6-9`
```python
class Role(str, Enum):
    patient = "patient"
    doctor = "doctor"
    owner = "owner"
    # ❌ MISSING: nurse = "nurse"
```
**Grade:** ❌ FAIL
**Fix:** Add `nurse = "nurse"` to Role enum

---

### Issue #2: No Nurse Demo User
**File:** `@backend/app/data/users.py:16-48`
- Only seeds: owner, doctor, patient1, patient2
- ❌ No nurse user seeded

**Grade:** ❌ FAIL
**Fix:** Add nurse user with credentials

---

### Issue #3: Frontend Role Type Missing Nurse
**File:** `@frontend/app/page.tsx:26`
```typescript
role: 'owner' | 'doctor' | 'patient';
// ❌ MISSING: | 'nurse'
```
**Grade:** ❌ FAIL
**Fix:** Update User interface to include `'nurse'`

---

### Issue #4: No Nurse Quick Actions
**File:** `@frontend/app/page.tsx:100-114`
- `DOCTOR_QUICK_ACTIONS` defined (6 actions)
- `PATIENT_QUICK_ACTIONS` defined (4 actions)
- ❌ `NURSE_QUICK_ACTIONS` missing

**Grade:** ❌ FAIL
**Fix:** Add nurse-specific quick actions

---

### Issue #5: Login Redirect Missing Nurse
**File:** `@frontend/app/login/page.tsx:29-32`
```typescript
if (role === 'owner') router.replace('/admin');
else if (role === 'doctor') router.replace('/ehr');
else if (role === 'patient') router.replace('/appointments');
// ❌ MISSING: nurse redirect
```
**Grade:** ❌ FAIL
**Fix:** Add nurse redirect to dedicated page

---

### Issue #6: Demo Credentials Missing Nurse
**File:** `@frontend/app/login/page.tsx:259-262`
```typescript
{ label: 'Doctor', email: 'doctor@example.com', pw: 'doctorpass' },
{ label: 'Admin', email: 'admin@example.com', pw: 'adminpass' },
// ❌ MISSING: Nurse demo account
```
**Grade:** ❌ FAIL
**Fix:** Add nurse demo credentials button

---

## 🟡 MISSING FEATURES (Should Add)

### Feature #1: Nurse Dashboard Page
**Status:** ❌ Does not exist
**Needed:** `/frontend/app/nurse/page.tsx`
**Features Required:**
- Patient assignment list
- Medication due times
- Vital signs entry
- Shift handoff view

---

### Feature #2: Nurse-Specific API Routes
**Status:** ❌ Does not exist
**Needed:** `/backend/app/routers/nurse.py`
**Endpoints Required:**
- `GET /nurse/assignments` - Get assigned patients
- `POST /nurse/vitals` - Record vital signs
- `POST /nurse/medication-admin` - Log medication administration
- `GET /nurse/shift-handoff` - Generate handoff report

---

### Feature #3: Nurse AI Tools
**Status:** ⚠️ Partial (medications router exists)
**File:** `@backend/app/routers/medications.py`
- ✅ Medication lookup exists
- ❌ Dose calculator missing
- ❌ Drug interaction checker missing
- ❌ IV calculator missing

---

### Feature #4: RBAC for Nurse-Specific Data
**Status:** ❌ Not implemented
**Needed:** Restrict nurse access to:
- Only assigned patients
- Medication administration (not prescribing)
- Vital signs recording
- Read-only access to physician orders

---

## 🟢 EXISTING INFRASTRUCTURE (Can Reuse)

### ✅ What's Already Working

| Component | Status | Can Reuse For Nurse |
|-----------|--------|---------------------|
| JWT Auth | ✅ Working | Yes - add nurse role to token |
| RBAC `require_roles()` | ✅ Working | Yes - add Role.nurse |
| PHI Guardrail | ✅ Working | Yes - same HIPAA rules |
| Audit Logging | ✅ Working | Yes - track nurse actions |
| Medication Router | ✅ Working | Yes - extend for nurse use |
| Vector Store (RAG) | ✅ Working | Yes - nurse queries |
| LangFuse Observability | ✅ Working | Yes - monitor nurse AI usage |

---

## 📋 Implementation Priority

### Phase 1: Backend RBAC (Required First)
1. Add `nurse` to Role enum
2. Add nurse demo user
3. Update HIPAA policy for nurse PHI access

### Phase 2: Frontend Auth
4. Update User type to include nurse
5. Add nurse login redirect
6. Add nurse demo credentials

### Phase 3: Nurse Dashboard
7. Create `/nurse` page
8. Add NURSE_QUICK_ACTIONS
9. Build nurse-specific UI components

### Phase 4: Nurse API Routes
10. Create nurse router with endpoints
11. Add IV calculator tool
12. Add dose calculator tool

---

## 🎯 Estimated Effort

| Task | Files to Modify | Complexity | Risk |
|------|-----------------|------------|------|
| Add nurse role | 2 | Low | Low |
| Add nurse user | 1 | Low | Low |
| Frontend types | 2 | Low | Low |
| Login flow | 1 | Low | Low |
| Nurse dashboard | 1 (new) | Medium | Low |
| Quick actions | 1 | Low | Low |
| Nurse API routes | 1 (new) | Medium | Medium |
| AI tools | 1 | Medium | Medium |

**Total:** ~8 files to modify/create

---

## ✅ Recommendation

**Proceed with caution** - Start with Phase 1 (backend RBAC) since all other features depend on the role being recognized. Test each phase before moving to the next.

**Testing Checklist:**
- [ ] Nurse role accepted in JWT
- [ ] Nurse can login
- [ ] Nurse redirected to correct page
- [ ] Nurse sees correct quick actions
- [ ] Nurse API endpoints work
- [ ] Audit logs capture nurse actions
