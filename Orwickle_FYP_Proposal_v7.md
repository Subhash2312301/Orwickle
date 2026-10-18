**Final Year Project**

**Orwickle: A Verified Mobile Marketplace for Student and Developer Projects with Investor and Buyer Bidding and Agreement Management**

**Project Team:**

- Subhash Rai (2312301)
- Avinash (2312359)

**Project Supervisor:** Faryal Zia

**Date:** October 6, 2026

Submitted in partial fulfillment of the requirements for the degree of

**Bachelor of Science in Computer Science**

in the

Faculty of Computing and Engineering Sciences

Shaheed Zulfiqar Ali Bhutto Institute of Science and Technology University

(SZABIST University)

Karachi Campus

---

# 1. Introduction

Students and individual developers in Pakistan regularly build software projects and early-stage startup ideas, yet many struggle to reach the investors who could fund them or the buyers who could purchase a finished product. Discovery today depends on emails, social media posts, and personal networks, which makes it hard to find relevant contacts and almost impossible to control who sees confidential documents such as pitch decks and project reports. The funding environment adds to the difficulty: disclosed startup equity funding in Pakistan rose to about $36.6 million in 2025 from $22.5 million in 2024, but remained far below the 2021 and 2022 peaks [1], and a policy study reports that startup funding fell by 88%, from $355 million in 2022 to $43 million in 2024 [2].

This is largely a problem of discovery and trust. When an investor or buyer cannot judge the quality of a listing, and an owner cannot judge who deserves access to sensitive material, both sides hold back, a pattern economists describe as information asymmetry [3]. Research on crowdfunding shows that structured, visible project presentation influences whether early-stage projects attract backers [4]. A structured platform that separates funding opportunities from projects for sale, lets the owner decide who sees what, and records the terms discussed between the parties is not yet widely available for student and individual-developer projects in Pakistan.

Orwickle addresses this gap through a mobile application in which a project owner lists a project under either "Seeking Funding" or "Available for Purchase." Investors and buyers browse the relevant section, view a basic preview, and send an access request. Once the owner approves, the investor or buyer can submit an offer (a bid) for the project, and the owner can accept, reject, or counter it, with every version of the offer preserved. In the second semester, selected documents are shared from private storage, a discussion takes place in the in-app chat, and an accepted offer is turned into a draft agreement that both parties review and acknowledge. An administrator dashboard, delivered last, adds evidence review of profiles and listings, verification badges, and the handling of reports.

Orwickle is an evidence-review and deal-workflow management prototype. It does not guarantee the authenticity of an investor's financial capacity, the commercial success of a startup, the accuracy of every submitted claim, or the legal enforceability of generated agreements; verification means only that specified evidence has been reviewed according to the platform's documented policy. Payment and legal execution are handled by the parties themselves, and the application does not approve investments, hold funds, process payments, or guarantee payment. The system uses Flutter for the mobile application, React.js for the administrator dashboard, a Node.js (Express) backend, PostgreSQL hosted on Supabase for relational data, and Supabase Storage for private files. Firebase is not used anywhere in the implementation.

# 2. Objective

The objective of this project is to design, develop, and evaluate Orwickle, a cross-platform mobile marketplace application that gives students and developers a structured way to showcase their projects and reach suitable investors and buyers. The system keeps startup funding and small-project sales in separate sections, supports category-based discovery with filters, and gives the project owner control over access to sensitive documents through a request, approval, and private file-sharing workflow. It adds a structured one-to-one bidding workflow of offers, counteroffers, acceptance, and rejection with a preserved version history, and it generates a draft agreement from the accepted offer with a recorded acknowledgement by each party. It also provides real-time chat between accepted connections, in-app notifications, a reporting mechanism, a completed-deal count that is updated only when both parties confirm, and, as the last deliverable, an administrator dashboard for evidence review, verification, and moderation. The work is split into five features in FYP-I, ending with bidding, and six features in FYP-II, including draft agreement management.

Specifically, the project aims to:

- Develop a mobile marketplace for software projects seeking investment or available for purchase.

- Implement role-based authentication and access permissions for project owners, investors, buyers, and administrators.

- Establish a documented investor and project verification policy supported by an administrative evidence-review workflow.

- Enable project owners to control access to confidential project documents.

- Implement a structured bidding workflow of offers, counteroffers, acceptance, and rejection that preserves the offer version history (FYP-I).

- Generate draft agreements (term sheets) from mutually accepted offer terms and record each party's acknowledgement of a specific version (FYP-II).

- Develop an administrator dashboard for verification, moderation, and audit records.

- Define and evaluate a plausible business model through stakeholder feedback and documented assumptions.

- Test the application for functional correctness, access-control failures, usability, and reliability.

# 3. Problem Description

**What:** Students and individual developers own projects, but they have difficulty reaching suitable investors or software buyers. Finding projects through emails and social media posts is slow, identifying relevant contacts is uncertain, and sharing confidential documents through open channels gives the owner little control. Placing startups that need funding and small software projects for sale in a single feed makes matters worse, because investors receive irrelevant listings and buyers must filter through opportunities they never wanted. Once interest exists, the terms that are discussed are rarely recorded in a structured way.

**Why:** The underlying gap is one of structure, relevance, and access control rather than a shortage of projects or interested parties. Without separate sections for the two categories, without a way for the owner to decide who may open sensitive documents, and without a review step before listings are trusted, the owner takes on unnecessary exposure and the investor or buyer takes on unnecessary search effort and uncertainty about credibility [3]. Without a structured record of offers, counteroffers, and the terms finally accepted, the parties depend on scattered messages that are easy to dispute or misremember.

**How:** Orwickle replaces this informal process with a structured workflow. The owner creates a profile and lists a project as "Seeking Funding" or "Available for Purchase," with the public preview and the confidential details kept in separate records. Investors explore the funding section and buyers explore the sales section, using categories and filters, and send an access request after viewing the basic preview. The owner approves or rejects each request. Approved investors and buyers submit offers that the owner accepts, rejects, or counters, and each version is preserved. Only after approval are selected documents shared from a private storage bucket through short-lived links, and approved parties discuss the project in real-time chat. An accepted offer generates a draft agreement that both parties review and acknowledge by version. Users can report suspicious profiles, listings, or messages, the completed-deal count on a profile increases only when both parties confirm a deal, and the administrator dashboard reviews evidence for profiles and listings, issues verification badges, and acts on reports.

# 4. Target Industry

**Primary industry:** The startup-funding and small-software-project marketplace segment, covering student and individual-developer projects on the supply side and early-stage investors (such as angel investors) and software buyers (such as small businesses and agencies) on the demand side. The initial deployment and evaluation are scoped to a pilot in Karachi with reviewed investors, before any consideration of wider expansion.

**Secondary application domains:** Marketplaces for buying and selling online businesses and software already exist internationally, for example Flippa [5] and Acquire.com [6]. Orwickle applies a similar discover-request-discuss model to student and individual-developer projects, and it additionally separates funding from sales, puts document access under the owner's control, and records offers and draft agreement terms in a structured workflow. Universities, incubation centers, and innovation offices could use the same model as a project showcase. Extension to other regions, other project types, or an investor subscription model is a possible future direction and is not part of the primary evaluation claim of this project.

# 5. Methodology

The project follows an iterative Agile/Scrum approach, with work organized into two-week sprints across FYP-I and FYP-II so that deliverables are demonstrated incrementally rather than deferred to the end of each semester. Every sprint produces a demonstrable feature or tested increment, and progress is shown to the supervisor at least every two weeks.

- **Application Architecture:** A single Flutter codebase [7] serves both Android and iOS. The user's role (Project Owner, Investor, or Buyer) is selected at sign-up and determines which screens and actions are available. The application talks to a Node.js backend over a REST API and sends the user's access token with each request.

- **Backend / API Layer:** A Node.js [8] server built with Express.js [9] verifies each request's token and role and applies the business rules: input validation, access-request handling, owner permission checks, offer and counteroffer rules, agreement versioning, report handling, completed-deal confirmation, and audit records. It also issues short-lived access to private files. Administrator credentials and service keys stay on the server and are never placed in the mobile application. One selected backend hosting service runs the server.

- **Authentication and Data Layer:** Authentication is managed by the backend using established libraries, and covers sign-up, login, password hashing, token-based sessions, email verification, and password reset. A PostgreSQL [10] database hosted on Supabase [11] stores users, profiles, listings, evidence metadata, access requests, offers, offer versions, agreement versions, acknowledgements, messages, notifications, reports, deal records, and audit records. Public preview data and confidential details are kept in separate tables so that a request for the preview can never expose confidential fields.

- **Privacy and Access Control:** The backend checks the token, role, and the owner's permission before any confidential information or file is released, and enforces these rules regardless of the interface displayed in the mobile application. Files are kept in a private Supabase Storage bucket [11] and never exposed through public storage URLs; after the permission check the backend returns only a short-lived link. Granting access cannot fully prevent a permitted person from copying or taking screenshots, and this residual risk is stated openly in the scope.

- **Verification and Trust:** Investor and project evidence is reviewed manually against a documented checklist, and every decision, reviewer, date, and reason is recorded in an audit trail. The platform never claims to certify financial capacity or business viability.

- **Bidding (FYP-I):** Approved investors and buyers submit funding or purchase offers to the owner, who can accept, reject, or counter them; all versions are preserved and only the intended recipient can respond.

- **Draft Agreement Management (FYP-II):** An accepted offer version generates a versioned draft term sheet, and each party's acknowledgement is recorded against the exact version.

- **Real-Time Chat and In-App Notifications:** Chat messages and notifications are stored in PostgreSQL and delivered live over WebSocket connections using Socket.IO [12] on the Express backend, so that messaging works only between accepted connections and the backend checks that the sender is a participant. Third-party push services are not used.

- **Discovery:** Funding opportunities and software projects for sale appear in two separate sections, and categories, search, and filters narrow the results so that investors and buyers see relevant projects only.

- **Administrator Dashboard (final FYP-II feature):** A separate React.js [13] web dashboard, backed by the same Node.js server and published on one selected dashboard hosting service, lets the administrator work through the evidence-review queues, approve or reject profiles and listings, request more evidence, suspend profiles or listings, handle reports, and view audit history and the status of offers and agreements. Until it is delivered, FYP-I and the early FYP-II features are demonstrated with seeded test records and pilot accounts, and each profile and listing already carries a review-status field so that the dashboard can enforce review without changing the data model. Administrator approval is not a guarantee of profitability or honesty, and every final decision remains with the parties.

# 6. Project Scope

The list-discover-request workflow for project owners, investors, and buyers, extended by bidding, is the delivery baseline for FYP-I (five features). Private document sharing, real-time chat, in-app notifications, draft agreement management, reporting with deal confirmation, and finally evidence review with the administrator dashboard are layered on in FYP-II (six features) once the core workflow passes integration testing.

## 6.1 In Scope

- Mobile application for Project Owners, Investors, and Buyers on a single Flutter codebase for Android and iOS, supported by a Node.js (Express) backend and a PostgreSQL database hosted on Supabase.

- Backend-managed role-based authentication with sign-up, login, email verification, password reset, and role profiles.

- Project listing under "Seeking Funding" and "Available for Purchase," with the public preview and the confidential details stored as separate records.

- Separate funding and sales sections with categories, search, and filters, and connection/access requests with owner approval or rejection and status tracking.

- Bidding (FYP-I): funding offers and sale offers, counteroffers, acceptance, rejection, offer expiry, offer version history, and recipient-only responses.

- Private storage of pitch PDFs, project documents, and screenshots, shared after owner approval through short-lived links; real-time chat between accepted connections; and in-app notifications.

- Draft agreement management (FYP-II): draft term sheet generation from the accepted offer version, agreement versioning, revision requests, and acknowledgement records.

- Reporting of profiles, listings, and messages, and mutual deal confirmation with a completed-deal count updated by the backend only after both parties confirm.

- Evidence submission and manual review for investors and projects with verification badges, and a React.js administrator dashboard for review, moderation, audit trail, and basic statistics (the last FYP-II feature).

- Business model documentation with stakeholder evaluation, and functional, security, and usability testing.

## 6.2 Out of Scope / Boundaries

- Approving investments, holding funds, processing payments, or guaranteeing payment; payment and legal execution are managed by the parties themselves.

- Any guarantee from administrator review about a project's profitability, ownership beyond the evidence assessed, or an investor's honesty, financial capacity, or intentions, and complete elimination of the risk of screenshots or copying once a person has been given permission.

- Firebase services of any kind; automated identity verification or national identity database integration (for example NADRA); bank-account, credit-history, or bank-balance verification; paid KYC and paid SMS OTP.

- Payment gateways, escrow, and fund transfers; automated company valuation, profitability prediction, and investment-return predictions; AI training and an AI API.

- Real-time auctions or competitive bidding among several bidders (bidding is a one-to-one offer and counteroffer workflow), and automatic equity agreements.

- Certified electronic signatures, legal advice, and any claim that generated agreements are legally enforceable.

- Third-party push notification services (notifications are in-app); investor subscription as a live feature; public release on the Google Play Store or Apple App Store; native platform-specific code beyond what Flutter provides; and production-scale deployment.

## 6.3 Key Assumptions

- The usage quotas of Supabase and the selected hosting services are sufficient for development, testing, and demonstration at FYP scale; if a quota is exceeded, limits or a paid upgrade will be decided.

- Seeded test records and a small set of reviewed pilot users are sufficient for evaluation. Until the administrator dashboard is delivered in FYP-II, listings are published without administrator review, and demonstration data is clearly identified as simulated unless the corresponding profile or project has undergone the stated evidence-review process.

- Payment and legal execution take place outside the application. FYP-I delivers authentication and profiles, project listing, discovery, access requests, and bidding; FYP-II delivers private documents, chat, in-app notifications, draft agreements, reports with deal badges, evidence review, and the administrator dashboard.

# 7. Feasibility Study

Given the scope defined above, the following assessment lists the risks that could affect the project schedule, together with the mitigation for each.

## 7.1 Risks Involved

| **#** | **Risk** | **Level** | **Mitigation** | **Timing** |
| --- | --- | --- | --- | --- |
| 1 | **Service quota limits** (Supabase, backend hosting idle sleep) exceeded during testing or demonstration | High | Paginated queries and caching; limit file size and type; monitor usage on each dashboard [11]; warm up the hosted backend before demonstrations; decide on limits or a paid upgrade if a quota is crossed. | Throughout |
| 2 | **Leak of confidential documents** or unauthorized access to private data | High | Separate preview and confidential tables; private bucket with short-lived links after a backend permission check; role checks on every endpoint; service keys on the server only; state that screenshot or copy risk cannot be eliminated. | FYP-II |
| 3 | **Fake or misleading profiles and listings**, spam, or misuse | High | Pilot limited to seeded and reviewed users in FYP-I; report mechanism and mutual-confirmation deal badges, then evidence review, verification badges, and moderation through the administrator dashboard at the end of FYP-II. | FYP-I/II |
| 4 | **Limited prior experience** with Flutter, Node.js, PostgreSQL, and Supabase | High | Spend the first weeks of FYP-I on tutorials and a small proof-of-concept (a Node.js endpoint that authenticates a token, runs a PostgreSQL query on Supabase, and issues a short-lived private file link). | FYP-I |
| 5 | **Scope creep** from too many features in limited time | High | Follow the fixed order of five FYP-I and six FYP-II features; excluded items (payments, escrow, auctions, KYC, AI) are not added; new features need a documented justification and supervisor approval; optional features must not delay verification, negotiation, agreements, or testing. | Throughout |
| 6 | **Offer and agreement integrity errors**, such as an unauthorized response to an offer or a silent change to accepted terms | High | Backend enforces recipient-only responses; offer and agreement versions are never overwritten and carry timestamps; any change to accepted terms creates a new version that needs fresh acknowledgement; automated tests for each rule. | FYP-I/II |
| 7 | **Empty marketplace** during evaluation due to a low initial user base | Medium | Seed realistic sample profiles and listings, clearly marked as simulated; onboard a small set of reviewed investors for the pilot. | FYP-I |
| 8 | **Access-control misconfiguration**, exposing private records or storage objects | Medium | Define private storage policies and role checks early, test each role with Postman and automated API tests, and re-test after every schema change. | FYP-II |
| 9 | **Platform mistaken for an investment or legal service** | Medium | The application does not accept, hold, or transfer funds, approve investments, or certify legally enforceable agreements; show clear disclaimers on listings and on every draft agreement; exclude return predictions and equity automation. | Throughout |

*Table 1: Feasibility Study – Risks and Mitigations*

## 7.2 Resource Requirement

| **Resource** | **Details** |
| --- | --- |
| **Development hardware** | Personal laptops or desktops (Windows or macOS) capable of running Android Studio, VS Code, and an Android emulator. |
| **Testing devices** | At least two Android smartphones, so that two roles (for example an owner and an investor) can be tested together for requests, offers, chat, and notifications. |
| **Software / IDE** | Flutter SDK, Dart, Node.js (LTS) with npm, React.js tooling, a PostgreSQL client, Android Studio, VS Code, Git/GitHub, and Postman. |
| **Backend / cloud** | A Supabase project providing the managed PostgreSQL database and a private Storage bucket, and a Node.js (Express) backend on one selected hosting service. |
| **Hosting** | One selected backend hosting service for the Express APIs and one selected dashboard hosting service for the React dashboard, to be finalized during the first milestone. |
| **Design** | Figma for UI/UX wireframing and prototyping before development. |
| **Internet access** | Stable internet connectivity for cloud-based development, testing, and demonstrations. |

*Table 2: Resource Requirements*

# 8. Solution Application Areas

| **Application Area** | **How Orwickle Adds Value** |
| --- | --- |
| **Student and developer project showcase** | A structured place to present a project, with a public preview kept separate from confidential details. |
| **Startup funding discovery** | Investors explore funding opportunities in a dedicated section with categories and filters instead of searching through emails and social media posts. |
| **Small software project sales** | Buyers find small software projects for purchase, separate from funding opportunities. |
| **Bidding and negotiation** | Offers, counteroffers, and a preserved version history replace scattered messages when funding or purchase terms are negotiated. |
| **Draft agreement records** | Accepted terms become a versioned draft term sheet, with each party's acknowledgement recorded against the exact version (not a legally enforceable contract). |
| **Confidential document control** | Pitch documents and project files stay in private storage and are shared only after the owner's approval. |
| **Safer discovery and trust** | Evidence review with verification badges, reporting, administrator moderation, an audit trail, and completed-deal badges reduce spam and misuse and give a visible record of reviewed claims and confirmed deals. |
| **Incubator and academic use** | A case study for marketplace design, access control, and mobile development, and a possible showcase for universities and incubation centers. |

*Table 3: Solution Application Areas*

# 9. Tools / Technology

The proposed technology stack is listed below. **Firebase is not used anywhere in the implementation.** The backend implements authentication, authorization, input validation, and business rules. The database stores users, profiles, listings, evidence metadata, access requests, offers, offer versions, agreement versions, acknowledgements, and audit records. Private documents are stored outside public database records, and access is mediated by backend permission checks and private storage policies.

| **Category** | **Tool / Technology** | **Purpose** |
| --- | --- | --- |
| **Mobile application** | Flutter, Dart | Single cross-platform codebase for Project Owner, Investor, and Buyer. |
| **Admin web dashboard** | React.js | Evidence review, approvals, moderation, report handling, audit history, and statistics. |
| **Backend / REST APIs** | Node.js, Express.js | Authentication, authorization, input validation, and business rules for requests, offers, agreements, reports, and completion badges. |
| **Relational database** | PostgreSQL | Users, profiles, listings, evidence metadata, access requests, offers, offer versions, agreement versions, acknowledgements, messages, notifications, reports, and audit records. |
| **Database hosting** | Supabase | Managed hosting of the PostgreSQL database. |
| **Private document storage** | Supabase Storage | Pitch PDFs, documents, evidence files, and generated draft agreements in a private bucket with short-lived access. |
| **Authentication** | Backend-managed authentication using established libraries | Sign-up, login, password hashing, token-based sessions, email verification, and password reset; token and role verified on every request. |
| **Chat and notifications** | Socket.IO (WebSockets) on the Express backend | Live messaging between accepted connections and in-app notifications; the backend checks that the sender is a participant. |
| **Draft agreement generation** | Server-side PDF generation library | Renders the accepted offer terms into a versioned draft term sheet. |
| **Development tools** | Visual Studio Code, Android Studio | Coding, emulator testing, and debugging. |
| **Version control** | Git, GitHub | Source code, requirements, and issue management and team collaboration. |
| **API testing** | Postman | Testing and documenting the Express APIs, including permission tests. |
| **UI/UX design** | Figma | Wireframes and interactive prototypes prior to development. |
| **Deployment** | One selected backend hosting service and one selected dashboard hosting service | Runs the Express APIs and publishes the React dashboard. |

*Table 4: Tools and Technology Stack*

The team justifies each choice by its purpose in the system:

- **PostgreSQL on Supabase:** Offers, offer versions, agreement versions, and acknowledgements are strongly related records. A relational database with constraints and transactions keeps this history consistent, and Supabase provides managed hosting and private storage in one project.

- **Backend-managed authentication and Node.js (Express):** All authorization rules, such as recipient-only responses to offers and owner approval before document access, live in one backend and apply no matter which interface sends the request.

- **Flutter and React.js:** Flutter gives one codebase for Android and iOS, and React.js suits the web-based administrator dashboard; both talk only to the same REST API.

- **Socket.IO:** It adds live chat and in-app notifications to the existing Express server without a separate third-party service.

# 10. Expertise of the Team Members

The project team consists of two members, both of whom have completed the core coursework required for this project. The first member has studied software engineering and database systems and has prior experience with mobile application development, which supports the Flutter implementation and the database design. The second member has studied UI/UX and software development and is responsible for interface design, ensuring that the application remains usable for owners, investors, and buyers. Both members will work closely on each feature so that both understand the system as a whole; design reviews, validation, documentation, and final integration are shared responsibilities.

# 11. Milestones

The work is organized as a one-year plan with five features in FYP-I and six features in FYP-II. The system defines four actor types: the Project Owner, who lists a project, controls access to its documents, negotiates offers, and discusses with approved parties; the Investor, who explores funding opportunities and submits offers; the Buyer, who explores software projects for sale and negotiates a purchase; and the Administrator, who reviews evidence, profiles, and listings and handles reports from a web dashboard delivered at the end of FYP-II.

## 11.1 Major Milestones

FYP-I runs from September 20, 2026 through January 31, 2027. FYP-II runs from February 15, 2027 through June 30, 2027. The first delivery gate is a complete vertical slice in which an owner lists a project, an investor or buyer finds it through discovery, sends an access request, the owner approves it, and the approved party submits an offer that the owner accepts, rejects, or counters. The final delivery gate is the fully tested system with draft agreements and the administrator dashboard.

**M1 Requirements Analysis and UI/UX Design**

**Tasks:** Finalize functional and non-functional requirements, use-case diagrams, and the entity-relationship diagram, including the separation of public preview and confidential records and the offer-version and agreement-version tables; prepare initial UI wireframes; set up GitHub, the Supabase project with PostgreSQL, the Node.js (Express) backend, and the Flutter application; demonstrate one basic end-to-end API request and database operation.

**Outcome:** Approved requirements document, wireframes, and a working technical skeleton (Flutter, Node.js, PostgreSQL, and Supabase).

**M2 Role-Based Authentication and Profile Setup**

**Tasks:** Implement backend-managed registration, login, password hashing, token-based sessions, email verification, and password reset for Project Owners, Investors, and Buyers; implement role-based authorization so the backend verifies each user's token and role; build the profile forms for each role.

**Outcome:** Working role-based authentication and profile module (Feature 1).

**M3 Project Listing with Public Preview and Confidential Details**

**Tasks:** Build the listing flow for "Seeking Funding" and "Available for Purchase," storing the public preview and confidential details as separate records; build the owner's screens for creating, editing, and managing listings.

**Outcome:** Owners can create and manage listings (Feature 2).

**M4 Discovery and Access Requests**

**Tasks:** Implement the separate funding and sales sections with categories, search, and filters; implement the connection/access request flow through the Node.js API, with owner approval or rejection and request status tracking.

**Outcome:** Complete discovery-to-request workflow, covering Features 3 and 4.

**M5 Bidding: Offer and Counteroffer Negotiation**

**Tasks:** Implement funding offer forms (amount, equity percentage, conditions, expiry) and sale offer forms (price, deliverables, transfer conditions, expiry); implement accept, reject, and counteroffer actions; preserve offer versions and timestamps; enforce recipient-only responses and participant permissions; add negotiation status views and offer expiry handling.

**Outcome:** Complete one-to-one bidding workflow with preserved offer history (Feature 5), the last of the five FYP-I features.

**M6 FYP-I Testing and Documentation**

**Tasks:** Conduct unit and integration testing, including role and permission checks on the APIs and tests that a user cannot respond to or modify another user's offer; fix defects; prepare FYP-I documentation and presentation.

**Outcome:** Complete list-discover-request-bid workflow, marking the FYP-I delivery gate; FYP-I working prototype and report.

**M7 Private Document Sharing and Access Policies**

**Tasks:** Set up the private Supabase Storage bucket; implement document upload by owners, owner selection of which documents an approved person may open, the backend permission check, and short-lived access links; test unauthorized access to private documents.

**Outcome:** Controlled document access in which no private file is reachable without the owner's permission (Feature 6).

**M8 Real-Time Chat and In-App Notifications**

**Tasks:** Build in-app chat between accepted connections using Socket.IO WebSocket connections with backend participant checks and stored message history; implement in-app notifications for requests, offers, approvals, agreement updates, and new messages.

**Outcome:** Working communication channel between accepted parties, with timely alerts (Features 7 and 8).

**M9 Draft Agreement Management**

**Tasks:** Generate a draft term sheet from the accepted offer version; implement agreement versions, revision requests, and acknowledgement records for each party; prevent silent modification of acknowledged versions and require fresh acknowledgement after any change; store generated documents privately; add audit records for important actions.

**Outcome:** Complete flow from an accepted offer to a draft agreement acknowledged by both parties against a specific version (Feature 9).

**M10 Reports and Deal-Completion Badges**

**Tasks:** Implement report submission for profiles, listings, and messages; implement mutual deal confirmation, with the backend updating the completed-deal count only after both parties confirm.

**Outcome:** Report submission and a completed-deal badge that reflects confirmed deals only (Feature 10).

**M11 Evidence Review and Administrator Panel**

**Tasks:** Implement evidence submission for investors and projects with private storage; build the React.js administrator dashboard with the verification and project evidence-review queues, approve, reject, request-more-evidence, and suspend actions with recorded reasons, user report moderation, verification and decision history, an offer and agreement status overview, basic statistics, and the audit trail; deploy it on the selected dashboard hosting service.

**Outcome:** Evidence-reviewed publication of profiles and listings with verification badges, and a moderation workflow, the last of the six FYP-II features (Feature 11).

**M12 Final Testing and Deployment**

**Tasks:** Freeze the feature set; complete functional, integration, security, and usability testing and final regression testing; deploy the backend and the dashboard; complete the business model canvas and stakeholder feedback; complete the final documentation, user guide, and test report; rehearse the FYP defense.

**Outcome:** Final tested prototype, complete documentation, and defense-ready presentation.

## 11.2 FYP-I Features

| **#** | **Feature** | **Technology** | **Description** |
| --- | --- | --- | --- |
| 1 | **Role-Based Authentication and Profile Setup** | Flutter, Node.js (Express), PostgreSQL | Backend-managed sign-up, login, email verification, and password reset for Project Owners, Investors, and Buyers; the backend verifies the token and role on each request; each role completes a profile. |
| 2 | **Project Listing with Public Preview and Confidential Details** | Flutter, Node.js, PostgreSQL | The owner lists a project as "Seeking Funding" or "Available for Purchase"; the public preview and the confidential details are stored as separate records. |
| 3 | **Category-Based Discovery and Filters** | Flutter, PostgreSQL | Funding opportunities and projects for sale appear in separate sections; categories, search, and filters help investors and buyers find relevant projects. |
| 4 | **Connection / Access Request System** | Node.js (Express), PostgreSQL | After viewing the basic preview, an investor or buyer sends an access request; the owner approves or rejects it, and the status is tracked as Pending, Approved, or Rejected. |
| 5 | **Bidding: Offer and Counteroffer Negotiation** | Flutter, Node.js (Express), PostgreSQL | An approved investor or buyer submits a funding or purchase offer; the owner accepts, rejects, or counters it; each counteroffer is a new linked version, the history is preserved, expiry is enforced, and only the intended recipient can respond. |

*Table 5: FYP-I Features (5)*

## 11.3 FYP-II Features

| **#** | **Feature** | **Technology** | **Description** |
| --- | --- | --- | --- |
| 6 | **Owner-Controlled Private Document Sharing** | Supabase Storage, Node.js, PostgreSQL | Documents stay in a private bucket; after the owner approves a request and selects documents, the backend checks token, role, and permission and provides short-lived access. |
| 7 | **Real-Time Chat** | Socket.IO, Node.js, PostgreSQL | Live messaging between accepted connections only; the backend allows reading and writing only for the two participants and stores the message history. |
| 8 | **In-App Notifications** | Socket.IO, Node.js, PostgreSQL | Alerts for new requests, approvals or rejections, new offers and counteroffers, agreement updates, and new messages, stored per user and delivered live inside the app. |
| 9 | **Draft Agreement Management** | Node.js, PostgreSQL, PDF generation library, Supabase Storage | When an offer is accepted, the system generates a draft term sheet from that offer version; both parties can request revisions and acknowledge a specific version; changed terms create a new version that needs fresh acknowledgement; the document is a draft record, not a legal contract. |
| 10 | **Reports and Deal-Completion Badges** | Node.js, PostgreSQL, Flutter | Users report suspicious profiles, listings, or messages; when both parties confirm a completed deal, the backend updates the completed-deal count shown as a badge. |
| 11 | **Evidence Review, Verification Badges and Administrator Panel** | React.js, Node.js (Express), PostgreSQL, Supabase Storage | Investors and owners submit evidence; the administrator reviews it against a checklist, approves, rejects, requests more evidence, or suspends, with a reason recorded; the Investor Credentials Reviewed and Project Evidence Reviewed badges are issued; the dashboard also handles reports, shows offer and agreement status, and keeps the audit trail. |

*Table 6: FYP-II Features (6)*

## 11.4 Actor Goal Matrix

| **Actor** | **Goal** | **Expected Benefit** | **Priority** |
| --- | --- | --- | --- |
| **Project Owner** | List a project as Seeking Funding or Available for Purchase | Structured visibility to relevant investors and buyers in place of scattered emails and posts. | High |
| **Project Owner** | Control who can see confidential documents | Approves or rejects each request and shares only selected documents. | High |
| **Project Owner** | Receive, accept, reject, or counter offers (FYP-I) | A structured bidding record with preserved versions instead of informal messages. | High |
| **Project Owner** | Review and acknowledge a draft agreement (FYP-II) | Accepted terms become a versioned draft that records exactly what each party acknowledged. | Medium |
| **Project Owner** | Discuss with approved parties and record completed deals | In-app chat and a completed-deal badge once both parties confirm. | Medium |
| **Investor** | Discover funding opportunities, request access, and submit offers | Dedicated funding section with filters, owner approval, structured offers, and real-time chat. | High |
| **Investor** | Review and acknowledge a draft term sheet (FYP-II) | A clear record of the accepted terms and version. | Medium |
| **Buyer** | Discover small software projects, request access, and negotiate price and deliverables | Dedicated sales section with filters, owner-approved access, and structured purchase offers. | High |
| **Administrator** | Review evidence and govern profiles, listings, and reports (FYP-II) | Evidence review, verification badges, and report handling reduce spam and misuse and keep an audit trail. | High |

*Table 7: Actor Goal Matrix*

## 11.5 System Context

The mobile application is the user-facing boundary for the Project Owner, Investor, and Buyer, and the web dashboard (FYP-II) is the boundary for the Administrator. Both connect to a Node.js (Express) backend on the selected hosting service, which authenticates each request, checks the user's role, and applies the business rules for access requests, offers, agreements, reports, and audit records. A PostgreSQL database hosted on Supabase stores the structured data, including chat messages and notifications. Supabase Storage holds the private documents, and the backend is the only component that issues short-lived access to them.

> **Diagram description (Figure 1 – System Context):** Four actors on the left: Project Owner, Investor, Buyer (all using the **Orwickle Mobile App, Flutter/Dart**), and the Administrator (FYP-II, using the **Admin Dashboard, React.js**). Both the mobile app and the admin dashboard connect (two-way) to a single **Node.js (Express) backend** (REST API + WebSocket, token and role checks, business rules: access, offers, agreements, reports, audit trail). The backend connects to **Supabase PostgreSQL Database** and **Supabase Storage (private bucket)**. Note on diagram: the backend alone issues short-lived file access.

*Figure 1: Orwickle System Context*

# 12. Project Schedule

The Gantt chart below presents the project timeline across both semesters. FYP-I spans September 2026 through January 2027 and covers five features, ending with the bidding module, and FYP-II spans February through June 2027 and covers six features, including draft agreement management and ending with evidence review and the administrator panel. The timeline corresponds directly to the milestones listed in Section 11. Week numbers in the work breakdown refer to working weeks of each semester; the calendar windows include buffer time for examinations and holidays.

> **Diagram description (Figure 2 – Gantt Chart):** Sequential, slightly overlapping bars. **FYP-I (Sep 2026 – Jan 2027):** Requirements Analysis, UI/UX & Backend Setup (late Sep – mid Oct) → Role-Based Authentication & Profile Setup (mid Oct – Nov 1) → Project Listing (Nov – mid Nov) → Category-Based Discovery & Filters (mid Nov – Dec) → Connection/Access Request System (Dec) → Bidding: Offer & Counteroffer Negotiation (late Dec – mid Jan) → FYP-I Testing, Documentation & Report (mid – end Jan). **FYP-II (Feb – Jun 2027):** Private Document Sharing (mid Feb – early Mar) → Real-Time Chat (Mar) → In-App Notifications (Mar – early Apr) → Draft Agreement Management (Apr) → Reports & Deal-Completion Badges (late Apr – early May) → Evidence Review & Administrator Panel (May – early Jun) → Final Testing, Deployment & FYP-II Report (Jun).

*Figure 2: Orwickle Project Gantt Chart*

# 13. Work Breakdown Structure

The Orwickle work breakdown is presented in two complementary views. The first view combines the work into a single, semester-agnostic structure grouped by functional area: Planning, Implementation, Programming, Testing, and Documentation. The second view splits the same work by semester, with the Fall semester corresponding to FYP-I and the Spring semester corresponding to FYP-II.

> **Diagram description (Figure 3 – Combined WBS):** Root "ORWICKLE – Combined WBS (Fall + Spring)" with five branches.
> - **Planning:** Requirement Analysis; Use-Case Diagrams & ERD; UI/UX Wireframes; Supabase (PostgreSQL) + Node.js Setup; Business Model & Stakeholder Survey.
> - **Implementation (FYP-I):** PostgreSQL Schema + Node.js API Setup; Role-Based Auth & Profile Setup; Project Listing (Preview + Confidential); Category-Based Discovery & Filters; Connection / Access Request System; Bidding: Offers & Counteroffers.
> - **Programming (FYP-II):** Private Document Sharing; Real-Time Chat; In-App Notifications; Draft Agreement Management; Reports & Deal-Completion Badges; Evidence Review & Admin Panel.
> - **Testing:** Unit & Integration Testing (incl. API); Access-Control & Security Testing; Bug Fixing; Final Regression Testing.
> - **Documentation:** SRS; SDS; FYP-I Report; FYP-II Report & Defense Prep; Test Report & User Guide.

*Figure 3: Orwickle Combined Work Breakdown Structure (Fall and Spring)*

The Fall semester (FYP-I) is broken into six phases and the Spring semester (FYP-II) into six, so that each of the eleven features has a dedicated place in the plan: bidding closes the Fall semester, draft agreement management sits in the middle of the Spring semester, and the Administrator Panel is the last feature. Every task follows the same analysis-build-test cycle under the Agile approach adopted for this project.

## Fall Semester (FYP-I) Work Breakdown Structure

> **Diagram description (Figure 4 – Fall Semester WBS):** Visual breakdown of the six FYP-I phases listed in Table 8 below.

*Figure 4: Fall Semester (FYP-I) Work Breakdown Structure*

| **Phase** | **Weeks** | **Tasks** | **Deliverable** |
| --- | --- | --- | --- |
| **Phase 1: Planning and Design** | 1-3 | Discuss and finalize requirements; prepare use-case diagrams and the ERD; prepare initial UI wireframes; create the Supabase project and set up the Node.js (Express) backend and the Flutter application. | SRS document, UI wireframes, and technical skeleton |
| **Phase 2: Authentication and Profiles** | 4-6 | Implement registration, login, token-based sessions, email verification, and password reset; add role-based authorization middleware; build the role profile forms. | Working role-based authentication |
| **Phase 3: Project Listing** | 7-8 | Build the listing form for funding and sale, with the public preview and confidential details stored as separate records. | Listing module |
| **Phase 4: Discovery and Access Requests** | 9-11 | Implement separate funding and sales sections with categories and filters; implement the access-request flow through the Node.js API with owner approval or rejection and status tracking. | End-to-end request demo |
| **Phase 5: Bidding: Offers and Counteroffers** | 12-14 | Build funding and sale offer forms; implement accept, reject, and counteroffer actions; preserve offer versions and timestamps; enforce recipient-only responses; add negotiation status views and expiry handling. | Complete bidding workflow |
| **Phase 6: FYP-I Testing and Report** | 15-16 | Conduct unit and integration testing, including role and permission checks and offer-permission tests; fix defects; prepare FYP-I documentation and presentation. | FYP-I prototype and report |

*Table 8: Fall Semester (FYP-I) Phase Breakdown*

## Spring Semester (FYP-II) Work Breakdown Structure

> **Diagram description (Figure 5 – Spring Semester WBS):** Visual breakdown of the six FYP-II phases listed in Table 9 below.

*Figure 5: Spring Semester (FYP-II) Work Breakdown Structure*

| **Phase** | **Weeks** | **Tasks** | **Deliverable** |
| --- | --- | --- | --- |
| **Phase 1: Private Documents and Access Policies** | 1-3 | Set up the private Supabase Storage bucket; implement owner uploads, document selection for each approved person, short-lived access links, and tests for unauthorized access. | Controlled document access |
| **Phase 2: Chat and Notifications** | 4-6 | Build chat between accepted connections using Socket.IO with backend participant checks and stored history; implement in-app notification records and live delivery for requests, offers, approvals, agreements, and messages. | Live chat and in-app alerts |
| **Phase 3: Draft Agreement Management** | 7-9 | Generate a draft term sheet from the accepted offer version; implement agreement versions, revision requests, and acknowledgement records; prevent silent changes to acknowledged versions; add audit records. | Draft agreement module |
| **Phase 4: Reports and Deal-Completion Badges** | 10-11 | Implement report submission; implement mutual deal confirmation and the backend update of the completed-deal count. | Reports and deal badge |
| **Phase 5: Evidence Review and Administrator Panel** | 12-14 | Implement evidence submission; build the React.js dashboard with verification and project review queues, approve, reject, request-evidence, and suspend actions, report moderation, history, statistics, and the audit trail; deploy it. | Live administrator panel |
| **Phase 6: Final Testing and Deployment** | 15-16 | Test the complete application, including functional, security, permission, and usability tests; deploy the backend and the dashboard; complete the business model evidence and the final report; prepare for the FYP defense. | Final app and FYP-II report |

*Table 9: Spring Semester (FYP-II) Phase Breakdown*

# 14. References

References are numbered in the order of first citation.

	[1]	"Startup funding in Pakistan rises to $36.6 million in 2025," Profit by Pakistan Today, Jan. 6, 2026. [Online]. Available: https://profit.pakistantoday.com.pk/2026/01/06/startup-funding-in-pakistan-rises-to-36-6-million-in-2025/

	[2]	"Pakistan's startup sector at risk as funding crashes 88%," Nukta, reporting on "Closing the Funding Gap for Startups in Pakistan," accessed Oct. 2026. [Online]. Available: https://nukta.com/pakistan-startup-sector-funding

	[3]	G. A. Akerlof, "The Market for 'Lemons': Quality Uncertainty and the Market Mechanism," The Quarterly Journal of Economics, vol. 84, no. 3, pp. 488–500, 1970.

	[4]	E. Mollick, "The dynamics of crowdfunding: An exploratory study," Journal of Business Venturing, vol. 29, no. 1, pp. 1–16, 2014.

	[5]	Flippa, "Flippa – Marketplace for Buying and Selling Online Businesses," accessed Oct. 2026. [Online]. Available: https://flippa.com

	[6]	Acquire.com, "Acquire.com – Marketplace for Buying and Selling Startups," accessed Oct. 2026. [Online]. Available: https://acquire.com

	[7]	Google, "Flutter documentation," accessed Oct. 2026. [Online]. Available: https://docs.flutter.dev

	[8]	OpenJS Foundation, "Node.js documentation," accessed Oct. 2026. [Online]. Available: https://nodejs.org/docs

	[9]	OpenJS Foundation, "Express – Node.js web application framework," accessed Oct. 2026. [Online]. Available: https://expressjs.com

	[10]	PostgreSQL Global Development Group, "PostgreSQL documentation," accessed Oct. 2026. [Online]. Available: https://www.postgresql.org/docs/

	[11]	Supabase, "Supabase documentation (Database and Storage)," accessed Oct. 2026. [Online]. Available: https://supabase.com/docs

	[12]	Socket.IO, "Socket.IO documentation," accessed Oct. 2026. [Online]. Available: https://socket.io/docs/v4/

	[13]	Meta Open Source, "React documentation," accessed Oct. 2026. [Online]. Available: https://react.dev
