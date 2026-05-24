# Case Study: AI-Assisted "Vibe Coding" & Strategic Complexity
**Project Reference:** Wizdent CRM vs. ROFF KAM Module
**Date:** May 14, 2026

## 1. The Challenges of "Vibe Coding" (Wizdent Journey)
"Vibe coding"—the process of describing intent and letting AI handle the implementation—has been the primary driver of Wizdent's development. While highly productive, several structural challenges emerged:

*   **Mental Model Drift:** As we added dozens of fields to the `Visit` object (Currency, Date Count, Financial Years, etc.), the complexity of the main form (`LogVisit.tsx`) grew. The challenge for the AI is maintaining a consistent mental model of the entire component state without introducing side effects in existing logic (like the Sales/Demo inventory calculations).
*   **The "Implicit" Schema Gap:** In our journey, we moved from 5 basic fields to 40+ specialized fields. The challenge lies in the "inference" of data types. If an image shows a "Slab" field, the AI must decide if it's a Number, Picklist, or String. A mismatch here leads to database validation errors later.
*   **Syntactic Hallucinations (The Hydration Event):** We encountered a specific "Hydration Error" where the AI nested a `<div>` inside a `<p>` tag while trying to design a polished Profile UI. This highlights that while AI excels at "vibe" and "design," it can occasionally ignore strict HTML/React specifications in favor of visual layout.
*   **Context Window Saturation:** As files like `LogVisit.tsx` or `Reports.tsx` exceed 500+ lines, providing enough context to the AI to make surgical edits without breaking the rest of the file becomes a precision game.

## 2. Challenges in Debugging AI-Generated Code
Debugging becomes fundamentally different when the code is "assisted." Unlike manual coding where you know every line, assisted coding requires "Post-Implementation Verification."

*   **The "Silent" Data Error:** We encountered a `TypeError: Cannot read properties of undefined (reading 'toFixed')`. This is a classic assisted-coding trap. The AI implemented a beautiful dashboard assuming all Firestore records would have numeric values. However, "dirty data" or legacy records without those fields caused the app to crash. Debugging this requires defensive programming (`(value || 0).toFixed()`), which AI sometimes skips for "speed."
*   **Layered Fault Finding:** When a "Log Visit" fails, is it a React state issue, a Firestore Rule restriction, or a Schema mismatch in the Blueprint? Because the AI writes across all three layers simultaneously, pinpointing the *cause* of a failure requires the developer to re-trace the AI's logic across multiple files.
*   **Dependency Cascades:** Adding a new icon or library (like `ShieldCheck`) often leads to "Missing Import" lint errors. While the fix is fast, these small hiccups in the "vibe flow" act as friction points that break the developer's momentum.

## 3. Complexity Uplift: Wizdent vs. ROFF
The ROFF BRD introduces a significant jump in complexity compared to Wizdent. Here are the new challenges we will face:

| Feature Dimension | Wizdent (Current) | ROFF (Proposed) | AI Coding Challenge |
| :--- | :--- | :--- | :--- |
| **Logic Model** | Transactional (Single log) | **State Machine** (0-30-60-90-100) | AI must manage multi-session state transitions. |
| **Integration** | Self-contained (Firebase) | **External Sync (SAP, Outlook)** | Mocking and handling production API contracts. |
| **Hierarchy** | Flat (Dealer -> Account) | **Relational (Sales H3/H4/H5)** | Managing complex data visibility rules in Firestore. |
| **Influencers** | Direct (Dentist) | **Multi-path (Architect/PMC)** | The UI must branch based on who the "lead" started with. |
| **Pricing** | Fixed Price Books | **Rebate/Slab Discount Matrix** | Complex math logic that requires strict unit testing. |

**The Primary Challenge for ROFF:** "Project Unity." Collating effort across different Sales Groups (407, 408, MSP, PLUB) means the AI cannot just look at "one user's data." It must architect a system where sales credit is shared, requiring sophisticated database indices and global state management.

## 4. Time & Effort Estimation (Comparative)

Estimated time for a fully functional, production-ready implementation.

### Wizdent CRM (Current Scope)
*   **Without AI (Traditional):** 4-6 Weeks (UI design, Firebase setup, manual form logic, reporting dashboards).
*   **With AI (Vibe Coding):** 1-1.5 Weeks (Rapid prototyping, instant layout generation, automated API wiring).
*   **AI Efficiency Gain:** ~75% Reduction in dev time.

### ROFF KAM Module (Complex Enterprise Scope)
*   **Without AI (Traditional):** 5-7 Months (System integrations, complex hierarchy logic, SAP middleware development, multi-stage testing).
*   **With AI (Vibe Coding):** 6-8 Weeks. 
    *   *Note:* The gain is slightly lower here because the human developer must spend more time on "Contract Verification" (ensuring the AI's integration logic matches the rigid SAP/Outlook API specs).
*   **AI Efficiency Gain:** ~60% Reduction in dev time.

## 5. Strategic Conclusion
Wizdent proved that AI can build a feature-rich CRM in days. ROFF will test if AI can build a **System of Record** involving legacy enterprise integrations. The shift for the developer moves from "Coding" to "Architecting & Auditing."
