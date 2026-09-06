   import { supabase } from "./src/supabase.js";
let selectedParcelId = null;
    const askBtn = document.getElementById("askBtn");
    const questionInput = document.getElementById("question");
    const stateInput = document.getElementById("state");
    const documentInput = document.getElementById("document");
    const answerBox = document.getElementById("answer");
    const recordSearch = document.getElementById("recordSearch");
    let currentRecord = null;

    // ==========================================
    // ASK AI
    // ==========================================

    askBtn.addEventListener("click", async () => {

        const question =
            questionInput.value.trim();

        const state =
            stateInput.value;

        const documentFile =
            documentInput.files[0];


        // ======================================
        // VALIDATION
        // ======================================

        if (!state) {

            answerBox.textContent =
                "Please select your state first. 🗺️";

            return;

        }


        if (!question && !documentFile) {

            answerBox.textContent =
                "Please enter a question or upload a document. 📄";

            return;

        }


        // ======================================
        // LOADING MESSAGE
        // ======================================

        if (documentFile) {

            answerBox.textContent =
                "BhoomiLedger AI is analyzing the document... 🤖";

        } else {

            answerBox.textContent =
                "BhoomiLedger AI is thinking... 🤖";

        }


        askBtn.disabled = true;


        try {

            let response;


            // ==================================
            // NORMAL QUESTION
            // ==================================

            if (!documentFile) {

                response = await fetch("/ask", {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        question:
                            question,

                        state:
                            state

                    })

                });

            }


            // ==================================
            // DOCUMENT
            // ==================================

            else {

                const formData =
                    new FormData();


                formData.append(
                    "state",
                    state
                );


                formData.append(
                    "question",
                    question
                );


                formData.append(
                    "document",
                    documentFile
                    
                );
               
               if (selectedParcelId) {
    formData.append(
        "parcel_id",
        selectedParcelId
    );
}

               const {
    data: { session }
} = await supabase.auth.getSession();

if (!session) {
    throw new Error(
        "Please login before uploading a land document."
    );
}

response = await fetch(
    "/analyze-document",
    {
        method: "POST",

        headers: {
            Authorization:
                `Bearer ${session.access_token}`
        },

        body: formData
    }
);


            }


            // ==================================
            // SERVER RESPONSE
            // ==================================

            const data =
                await response.json();
            console.log("🔥 AI RESPONSE RECEIVED:", data);
console.log("🔥 HTTP STATUS:", response.status);

            if (!response.ok) {

                throw new Error(
                    data.error ||
                    "AI request failed"
                );

            }


            // ==================================
            // DOCUMENT RESPONSE
            // ==================================

        if (
        documentFile &&
        data.record
    ) {

        displayLandRecord(data);

        loadRecords();
   loadDocumentHistory();
    }


            // ==================================
            // NORMAL AI RESPONSE
            // ==================================

            else {

                answerBox.innerHTML = `

                    <div class="ai-answer">

                        <div class="answer-provider">
                            🤖 ${data.provider || "AI"}
                        </div>

                        <p>
                            ${escapeHTML(
                                data.answer ||
                                "No answer received."
                            )}
                        </p>

                    </div>

                `;
                loadHistory();
               

            }


        } catch (error) {

            console.error(
                "Error:",
                error
            );


            answerBox.innerHTML = `

                <div class="ai-error">

                    😕 Something went wrong connecting
                    to BhoomiLedger AI.

                </div>

            `;

        } finally {

            askBtn.disabled = false;

        }

    });


    // ==========================================
    // DISPLAY LAND RECORD
    // ==========================================

    function displayLandRecord(data) {

        const record =
            data.record || {};


        answerBox.innerHTML = `

            <div class="land-result">

                <div class="result-header">

                    <div>

                        <div class="result-label">
                            AI DOCUMENT ANALYSIS
                        </div>

                        <h3>
                            📋 Land Record Summary
                        </h3>

                    </div>

                    <div class="provider-badge">
                        🤖 ${escapeHTML(
                            data.provider || "AI"
                        )}
                    </div>

                </div>


                <div class="land-grid">


                    ${createCard(
                        "👤",
                        "Recorded Holder",
                        record.recordedHolder
                    )}


                    ${createCard(
                        "👨",
                        "Father / Guardian",
                        record.fatherName
                    )}


                    ${createCard(
                        "🔢",
                        "Khata Number",
                        record.khataNumber
                    )}


                    ${createCard(
                        "🔢",
                        "Khasra Number",
                        record.khasraNumber
                    )}


                    ${createCard(
                        "📐",
                        "Land Area",
                        record.landArea
                    )}


                    ${createCard(
                        "🏘️",
                        "Village",
                        record.village
                    )}


                    ${createCard(
                        "🏛️",
                        "Tehsil",
                        record.tehsil
                    )}


                    ${createCard(
                        "📍",
                        "District",
                        record.district
                    )}


                    ${createCard(
                        "🗺️",
                        "State",
                        record.state
                    )}


                    ${createCard(
                        "🌾",
                        "Land Type",
                        record.landType
                    )}


                    ${createCard(
                        "📝",
                        "Record Status",
                        record.recordStatus
                    )}


                    ${createCard(
                        "🔄",
                        "Mutation",
                        record.mutationInfo
                    )}

                </div>


                <div class="ai-answer-box">

                    <div class="ai-answer-title">
                        🤖 BhoomiLedger AI
                    </div>

                    <p>
                        ${escapeHTML(
                            data.answer ||
                            "Document analyzed successfully."
                        )}
                    </p>

                </div>


                <div class="record-disclaimer">

                    ⚠️ This information is extracted from
                    the uploaded document. A recorded holder
                    should not automatically be treated as
                    legally verified ownership.

                </div>

            </div>

        `;

    }


    // ==========================================
    // CREATE INFORMATION CARD
    // ==========================================

    function createCard(
        icon,
        title,
        value
    ) {

        const safeValue =
            value &&
            value.trim
                ? value.trim()
                : "Not available";


        return `

            <div class="land-card">

                <div class="land-card-icon">
                    ${icon}
                </div>

                <div class="land-card-content">

                    <span>
                        ${title}
                    </span>

                    <strong>
                        ${escapeHTML(
                            safeValue
                        )}
                    </strong>

                </div>

            </div>

        `;

    }


    // ==========================================
    // SECURITY
    // Prevent AI text from injecting HTML
    // ==========================================

    function escapeHTML(value) {

        if (value === null ||
            value === undefined) {

            return "";

        }


        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    }
    // LOAD SAVED LAND RECORDS
    async function loadRecords() {
        const recordsContainer =
            document.getElementById("recordsContainer");

        if (!recordsContainer) {
            return;
        }

        recordsContainer.innerHTML =
            `<div class="records-loading">
                Loading saved records...
            </div>`;

        try {
            const response = await fetch("/records");
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.error || "Failed to load records"
                );
            }

            if (!data.records || data.records.length === 0) {
                recordsContainer.innerHTML =
                    `<div class="records-empty">
                        No saved land records yet.
                    </div>`;

                return;
            }

            recordsContainer.innerHTML =
            data.records.map(record => `
        <div
            class="record-card"
            onclick='openRecordDetails(${JSON.stringify(record)})'
        >
                        <div class="record-card-header">
                            <div class="record-icon">
                                📋
                            </div>

                            <div>
                                <h3>
                                    ${escapeHTML(
                                        record.recorded_holder ||
                                        "Unknown Holder"
                                    )}
                                </h3>

                                <span>
                                    ${escapeHTML(
                                        record.record_status ||
                                        "Land Record"
                                    )}
                                </span>
                            </div>
                        </div>

                        <div class="record-details">

                            <div>
                                <small>Khata Number</small>
                                <strong>
                                    ${escapeHTML(
                                        record.khata_number ||
                                        "Not available"
                                    )}
                                </strong>
                            </div>

                            <div>
                                <small>Khasra Number</small>
                                <strong>
                                    ${escapeHTML(
                                        record.khasra_number ||
                                        "Not available"
                                    )}
                                </strong>
                            </div>

                            <div>
                                <small>Location</small>
                                <strong>
                                    ${escapeHTML(
                                        record.district ||
                                        "Not available"
                                    )},
                                    ${escapeHTML(
                                        record.state ||
                                        ""                  
                                    )}
                                </strong>
                            </div>

                            <div>
                                <small>Land Area</small>
                                <strong>
                                    ${escapeHTML(
                                        record.land_area ||
                                        "Not available"
                                    )}
                                </strong>
                            </div>

                        </div>

                    </div>
                `).join("");

        } catch (error) {
            console.error(
                "Records loading error:",
                error
            );

            recordsContainer.innerHTML =
                `<div class="records-empty">
                    😕 Unable to load saved records.
                </div>`;
        }
    }

    // REFRESH RECORDS
    const refreshRecords =
        document.getElementById("refreshRecords");

    if (refreshRecords) {
        refreshRecords.addEventListener(
            "click",
            loadRecords
        );
    }


    // LOAD RECORDS WHEN PAGE OPENS
    loadRecords();
    // STATE FILTER
    const stateFilter = document.getElementById("stateFilter");

    if (stateFilter) {
        stateFilter.addEventListener("input", function () {

            const selectedState = this.value.toLowerCase().trim();

            const recordCards = document.querySelectorAll(".record-card");

            recordCards.forEach(card => {

                const cardText = card.textContent.toLowerCase();

                card.style.display =
                    !selectedState || cardText.includes(selectedState)
                        ? ""
                        : "none";

            });

        });
    }
    // DISTRICT FILTER
    const districtFilter = document.getElementById("districtFilter");

    if (districtFilter) {
        districtFilter.addEventListener("input", function () {

            const selectedDistrict =
                this.value.toLowerCase().trim();

            const recordCards =
                document.querySelectorAll(".record-card");

            recordCards.forEach(card => {

                const cardText =
                    card.textContent.toLowerCase();

                card.style.display =
                    !selectedDistrict ||
                    cardText.includes(selectedDistrict)
                        ? ""
                        : "none";

            });

        });
    }
    // RECORD STATUS FILTER
    const statusFilter = document.getElementById("statusFilter");

    if (statusFilter) {
        statusFilter.addEventListener("input", function () {

            const selectedStatus =
                this.value.toLowerCase().trim();

            const recordCards =
                document.querySelectorAll(".record-card");

            recordCards.forEach(card => {

                const cardText =
                    card.textContent.toLowerCase();

                card.style.display =
                    !selectedStatus ||
                    cardText.includes(selectedStatus)
                        ? ""
                        : "none";

            });

        });
    }

    if (recordSearch) {
        recordSearch.addEventListener("input", function () {

            const searchText =
                this.value.toLowerCase().trim();

            const recordCards =
                document.querySelectorAll(".record-card");

            recordCards.forEach(card => {

                const cardText =
                    card.textContent.toLowerCase();

                card.style.display =
                    !searchText ||
                    cardText.includes(searchText)
                        ? ""
                        : "none";

            });

        });
    }
    // ==========================================
    // OPEN RECORD DETAILS
    // ==========================================

    function openRecordDetails(record) {
    
        currentRecord = record;
        const detailsSection =
            document.getElementById("recordDetailsSection");

        const detailsContainer =
            document.getElementById("recordDetailsContainer");

        const recordsSection =
            document.querySelector(".records-section");

        if (!detailsSection || !detailsContainer || !recordsSection) {
            console.error("Record details section not found");
            return;
        }

        detailsContainer.innerHTML = `
            <div class="land-result">

                <div class="result-header">

                    <div>
                        <div class="result-label">
                            SAVED LAND RECORD
                        </div>

                        <h3>
                            📋 ${escapeHTML(
                                record.recorded_holder || "Unknown Holder"
                            )}
                        </h3>
                    </div>

                    <div class="provider-badge">
        🗄️ Saved Record
    </div>

    <div class="verification-badge">
        🟢 AI Analyzed
    </div>

                </div>

                <div class="land-grid">

                    ${createCard("👤", "Recorded Holder", record.recorded_holder)}

                    ${createCard("👨", "Father / Guardian", record.father_name)}

                    ${createCard("🔢", "Khata Number", record.khata_number)}

                    ${createCard("🧾", "Khasra Number", record.khasra_number)}

                    ${createCard("📐", "Land Area", record.land_area)}

                    ${createCard("🏘️", "Village", record.village)}

                    ${createCard("🏛️", "Tehsil", record.tehsil)}

                    ${createCard("📍", "District", record.district)}

                    ${createCard("🗺️", "State", record.state)}

                    ${createCard("🌾", "Land Type", record.land_type)}

                    ${createCard("📝", "Record Status", record.record_status)}

                    ${createCard("🔄", "Mutation", record.mutation_info)}

                </div>

                <div class="record-disclaimer">

                    ⚠️ This information is stored from the
                    analyzed land record. It should be verified
                    against official government records before
                    legal use.

                </div>

            </div>
        `;

        recordsSection.style.display = "none";

        detailsSection.style.display = "block";

        detailsSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
        // Run automatic land record issue check
checkRecordIssues(record);
    }
window.openRecordDetails = openRecordDetails;

    // ==========================================
    // CLOSE RECORD DETAILS
    // ==========================================

    const closeRecordDetails =
        document.getElementById("closeRecordDetails");

    if (closeRecordDetails) {

        closeRecordDetails.addEventListener("click", function () {

            const detailsSection =
                document.getElementById("recordDetailsSection");

            const recordsSection =
                document.querySelector(".records-section");

            detailsSection.style.display = "none";

            recordsSection.style.display = "block";

            recordsSection.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

        });
    }
    // ==========================================
    // RECORD AI COPILOT
    // ==========================================

    const recordAskBtn =
        document.getElementById("recordAskBtn");

    const recordQuestion =
        document.getElementById("recordQuestion");

    const recordAiAnswer =
        document.getElementById("recordAiAnswer");


    if (recordAskBtn) {

        recordAskBtn.addEventListener("click", async function () {

            const question =
                recordQuestion.value.trim();

            if (!currentRecord) {
                recordAiAnswer.textContent =
                    "Please open a saved record first.";
                return;
            }

            if (!question) {
                recordAiAnswer.textContent =
                    "Please enter a question about this record.";
                return;
            }

            recordAskBtn.disabled = true;

            recordAiAnswer.innerHTML =
                "🤖 BhoomiLedger AI is analyzing this record...";

            try {

                const recordContext = `
    Recorded Holder: ${currentRecord.recorded_holder || "Not available"}
    Father / Guardian: ${currentRecord.father_name || "Not available"}
    Khata Number: ${currentRecord.khata_number || "Not available"}
    Khasra Number: ${currentRecord.khasra_number || "Not available"}
    Land Area: ${currentRecord.land_area || "Not available"}
    Village: ${currentRecord.village || "Not available"}
    Tehsil: ${currentRecord.tehsil || "Not available"}
    District: ${currentRecord.district || "Not available"}
    State: ${currentRecord.state || "Not available"}
    Land Type: ${currentRecord.land_type || "Not available"}
    Record Status: ${currentRecord.record_status || "Not available"}
    Mutation: ${currentRecord.mutation_info || "Not available"}
    `;

                const response = await fetch("/ask", {

                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({

                        question: `
    You are BhoomiLedger AI.

    Answer the user's question using ONLY the saved land record information below.

    LAND RECORD:
    ${recordContext}

    USER QUESTION:
    ${question}

    Explain clearly in simple language.
    Do not claim legal ownership or legal validity.
    If information is missing, say it is not available.
                        `,

                        state: currentRecord.state || ""

                    })

                });

                const data =
                    await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.error || "AI request failed"
                    );
                }

                recordAiAnswer.innerHTML = `
                    <div class="ai-answer">
                        <div class="answer-provider">
                            🤖 ${escapeHTML(
                                data.provider || "AI"
                            )}
                        </div>

                        <p>
                            ${escapeHTML(
                                data.answer ||
                                "No answer received."
                            )}
                        </p>
                    </div>
                `;

            } catch (error) {

                console.error(
                    "Record Copilot error:",
                    error
                );

                recordAiAnswer.innerHTML =
                    "😕 Unable to get an AI response right now.";

            } finally {

                recordAskBtn.disabled = false;

            }

        });

    }
    // ==========================================
    // COPILOT QUICK ACTION BUTTONS
    // ==========================================

    const explainRecordBtn =
        document.getElementById("explainRecordBtn");

    const summarizeOwnershipBtn =
        document.getElementById("summarizeOwnershipBtn");

    const verifyRecordBtn =
        document.getElementById("verifyRecordBtn");

    const explainKhataBtn =
        document.getElementById("explainKhataBtn");


    async function askCopilotQuickQuestion(question) {

        if (!currentRecord) {

            recordAiAnswer.textContent =
                "Please open a saved record first.";

            return;

        }

        recordAiAnswer.innerHTML =
            "🤖 BhoomiLedger AI is analyzing this record...";

        try {

            const recordContext = `
    Recorded Holder: ${currentRecord.recorded_holder || "Not available"}
    Father / Guardian: ${currentRecord.father_name || "Not available"}
    Khata Number: ${currentRecord.khata_number || "Not available"}
    Khasra Number: ${currentRecord.khasra_number || "Not available"}
    Land Area: ${currentRecord.land_area || "Not available"}
    Village: ${currentRecord.village || "Not available"}
    Tehsil: ${currentRecord.tehsil || "Not available"}
    District: ${currentRecord.district || "Not available"}
    State: ${currentRecord.state || "Not available"}
    Land Type: ${currentRecord.land_type || "Not available"}
    Record Status: ${currentRecord.record_status || "Not available"}
    Mutation: ${currentRecord.mutation_info || "Not available"}
    `;

            const response = await fetch("/ask", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    question: `
    You are BhoomiLedger AI.

    Use ONLY the land record information provided below.

    LAND RECORD:
    ${recordContext}

    USER REQUEST:
    ${question}

    Answer clearly in simple language.

    Do not claim legal ownership or legal validity.
    If information is missing, say it is not available.
    `,
                    state: currentRecord.state || ""

                })

            });

            const data =
                await response.json();

            if (!response.ok) {

                throw new Error(
                    data.error || "AI request failed"
                );

            }

            recordAiAnswer.innerHTML = `
                <div class="ai-answer">

                    <div class="answer-provider">
                        🤖 ${escapeHTML(
                            data.provider || "AI"
                        )}
                    </div>

                    <p>
                        ${escapeHTML(
                            data.answer ||
                            "No answer received."
                        )}
                    </p>

                </div>
            `;

        } catch (error) {

            console.error(
                "Quick Copilot error:",
                error
            );

            recordAiAnswer.innerHTML =
                "😕 Unable to get an AI response right now.";

        }

    }


    // BUTTON 1
    if (explainRecordBtn) {

        explainRecordBtn.addEventListener(
            "click",
            () => {

                askCopilotQuickQuestion(
                    "Explain this entire land record in simple language. Tell me what the important fields mean."
                );

            }
        );

    }


    // BUTTON 2
    if (summarizeOwnershipBtn) {

        summarizeOwnershipBtn.addEventListener(
            "click",
            () => {

                askCopilotQuickQuestion(
                    "Summarize the ownership-related information in this record. Mention the recorded holder and father or guardian information if available."
                );

            }
        );

    }


    // BUTTON 3
    if (verifyRecordBtn) {

        verifyRecordBtn.addEventListener(
            "click",
            () => {

                askCopilotQuickQuestion(
                    "Based only on this record, what information should a person verify against official government records? Mention missing, unclear, or important fields."
                );

            }
        );

    }


    // BUTTON 4
    if (explainKhataBtn) {

        explainKhataBtn.addEventListener(
            "click",
            () => {

                askCopilotQuickQuestion(
                    "Explain the Khata number and Khasra number in this record, including what each generally represents and what values are present here."
                );

            }
        );

    }
    // ==========================================
    // QUESTION HISTORY
    // ==========================================

    async function loadHistory() {

        const historyContainer =
            document.getElementById("history");

        if (!historyContainer) {
            return;
        }

        try {

            const response =
                await fetch("/history");

            const data =
                await response.json();

            if (!response.ok || !data.success) {

                throw new Error(
                    data.error || "Failed to load history"
                );

            }


            // ======================================
            // NO HISTORY
            // ======================================

            if (!data.history || data.history.length === 0) {

                historyContainer.innerHTML = `
                    <div class="history-empty">

                        <p>
                            No previous questions yet.
                        </p>

                    </div>
                `;

                return;
            }


            // ======================================
            // CLEAR ALL BUTTON
            // ======================================

            historyContainer.innerHTML = `

                <div class="history-actions">

                    <button
                        type="button"
                        class="secondary-btn"
                        id="clearHistoryBtn"
                    >
                        🗑️ Clear All History
                    </button>

                </div>


                <div class="history-list">

                    ${data.history.map(item => `

                        <div
                            class="history-card"
                            data-history-id="${escapeHTML(item.id)}"
                        >

                            <div class="history-card-top">

                                <div class="history-question">

                                    ❓ ${escapeHTML(
                                        item.question ||
                                        "Question unavailable"
                                    )}

                                </div>

                                <button
                                    type="button"
                                    class="history-delete-btn"
                                    onclick="deleteHistoryItem('${escapeHTML(item.id)}')"
                                    title="Delete this question"
                                >
                                    🗑️
                                </button>

                            </div>


                            <div class="history-answer">

                                🤖 ${escapeHTML(
                                    item.answer ||
                                    "Answer unavailable"
                                )}

                            </div>

                        </div>

                    `).join("")}

                </div>
            `;


            // ======================================
            // CLEAR ALL HISTORY
            // ======================================

            const clearHistoryBtn =
                document.getElementById("clearHistoryBtn");

            if (clearHistoryBtn) {

                clearHistoryBtn.addEventListener(
                    "click",
                    clearAllHistory
                );

            }


        } catch (error) {

            console.error(
                "History loading error:",
                error
            );

            historyContainer.innerHTML = `
                <p>
                    Unable to load question history.
                </p>
            `;

        }

    }


    // ==========================================
    // DELETE ONE HISTORY ITEM
    // ==========================================

    async function deleteHistoryItem(id) {

        if (!id) {
            return;
        }


        const confirmed =
            confirm(
                "Delete this question from your history?"
            );


        if (!confirmed) {
            return;
        }


        try {

            const response =
                await fetch(
                    `/history/${encodeURIComponent(id)}`,
                    {
                        method: "DELETE"
                    }
                );


            const data =
                await response.json();


            if (!response.ok || !data.success) {

                throw new Error(
                    data.error ||
                    "Failed to delete history"
                );

            }


            // Reload history from Supabase

            await loadHistory();
            loadDocumentHistory();


        } catch (error) {

            console.error(
                "Delete history error:",
                error
            );

            alert(
                "Unable to delete this question."
            );

        }

    }


    // ==========================================
    // DELETE ALL HISTORY
    // ==========================================

    async function clearAllHistory() {

        const confirmed =
            confirm(
                "Are you sure you want to delete ALL question history?"
            );


        if (!confirmed) {
            return;
        }


        try {

            const response =
                await fetch(
                    "/history",
                    {
                        method: "DELETE"
                    }
                );


            const data =
                await response.json();


            if (!response.ok || !data.success) {

                throw new Error(
                    data.error ||
                    "Failed to clear history"
                );

            }


            // Reload history from Supabase

            await loadHistory();


        } catch (error) {

            console.error(
                "Clear history error:",
                error
            );

            alert(
                "Unable to clear question history."
            );

        }

    }


    // ==========================================
    // LOAD HISTORY WHEN PAGE OPENS
    // ==========================================

    loadHistory();
    // ==========================================
// LAND RECORD ISSUE DETECTION
// ==========================================

function checkRecordIssues(record) {

    const issueBox =
        document.getElementById("recordIssueResults");

    if (!issueBox) return;

    const issues = [];
    const complete = [];

    // Check important fields
    if (!record.recorded_holder) {
        issues.push("⚠️ Recorded land holder is missing.");
    } else {
        complete.push("Recorded land holder is available.");
    }

    if (!record.khata_number) {
        issues.push("⚠️ Khata number is missing.");
    } else {
        complete.push("Khata number is available.");
    }

    if (!record.khasra_number) {
        issues.push("⚠️ Khasra number is missing.");
    } else {
        complete.push("Khasra number is available.");
    }

    if (!record.land_area) {
        issues.push("⚠️ Land area is missing.");
    } else {
        complete.push("Land area is available.");
    }

    if (!record.village) {
        issues.push("⚠️ Village information is missing.");
    } else {
        complete.push("Village information is available.");
    }

    if (!record.district) {
        issues.push("⚠️ District information is missing.");
    } else {
        complete.push("District information is available.");
    }

    if (!record.state) {
        issues.push("⚠️ State information is missing.");
    } else {
        complete.push("State information is available.");
    }

    if (!record.mutation_info) {
        issues.push(
            "⚠️ Mutation information is missing or unclear."
        );
    }

    let html = "";

    if (issues.length > 0) {

        html += `
            <div class="issue-summary warning">
                <strong>⚠️ Attention needed</strong>
                <p>
                    BhoomiLedger found ${issues.length}
                    item${issues.length > 1 ? "s" : ""}
                    that should be checked.
                </p>
            </div>

            <div class="issue-list">
                <h4>Things to check</h4>
                ${issues.map(issue => `
                    <div class="issue-item">
                        ${escapeHTML(issue)}
                    </div>
                `).join("")}
            </div>
        `;

    } else {

        html += `
            <div class="issue-summary success">
                <strong>🟢 Record looks complete</strong>
                <p>
                    The important fields available in this
                    saved record are present.
                </p>
            </div>
        `;
    }

    if (complete.length > 0) {

        html += `
            <div class="complete-list">
                <h4>✓ Information available</h4>

                ${complete.map(item => `
                    <div class="complete-item">
                        🟢 ${escapeHTML(item)}
                    </div>
                `).join("")}

            </div>
        `;
    }

    html += `
        <div class="verification-note">
            <strong>📋 Important</strong>
            <p>
                This check only identifies missing or unclear
                information. Always verify the record with
                the relevant official government records before
                making legal or ownership decisions.
            </p>
        </div>
    `;

    issueBox.innerHTML = html;
}
// ==========================================
// DASHBOARD
// LOAD REAL SUPABASE STATISTICS
// ==========================================

    async function loadDashboard() {
    console.log("🔥 loadDashboard is running");
        const recordsCount =
            document.getElementById("dashboardRecords");

        const documentsCount =
            document.getElementById("dashboardDocuments");

        const questionsCount =
            document.getElementById("dashboardQuestions");

        const issuesCount =
            document.getElementById("dashboardIssues");


        // If dashboard is not on the page,
        // stop safely.
        if (
            !recordsCount &&
            !documentsCount &&
            !questionsCount &&
            !issuesCount
        ) {
            return;
        }


        try {

            const response =
                await fetch("/dashboard");
console.log("📊 Dashboard response:", response.status);

            const data =
                await response.json();
console.log("📦 Dashboard data:", JSON.stringify(data, null, 2));

            if (!response.ok || !data.success) {

                throw new Error(
                    data.error ||
                    "Failed to load dashboard"
                );

            }


            // ======================================
            // UPDATE DASHBOARD CARDS
            // ======================================

            if (recordsCount) {

                recordsCount.textContent =
                    data.records ?? 0;

            }


            if (documentsCount) {

                documentsCount.textContent =
                    data.documents ?? 0;

            }


            if (questionsCount) {

                questionsCount.textContent =
                    data.questions ?? 0;

            }


            if (issuesCount) {

                issuesCount.textContent =
                    data.issues ?? 0;

            }


            console.log(
                "Dashboard loaded:",
                data
            );


        } catch (error) {

            console.error(
                "Dashboard loading error:",
                error
            );

        }

    }


    // ==========================================
    // LOAD DASHBOARD WHEN PAGE OPENS
    // ==========================================

    loadDashboard();
    // =========================
// BHOOMILEDGER WEB GIS
// =========================

async function initializeBhoomiMap() {

    const mapContainer =
        document.getElementById("bhoomiMap");

    if (!mapContainer) {
        return;
    }

    const bhoomiMap = L.map("bhoomiMap").setView(
        [22.9734, 78.6569],
        5
    );
    // ==========================================
// BUILDING DISPLAY PANE
// Keeps buildings above cadastral parcels
// ==========================================

bhoomiMap.createPane("buildingPane");

bhoomiMap.getPane(
    "buildingPane"
).style.zIndex = 650;

    L.tileLayer(
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            maxZoom: 19,
            attribution:
                '&copy; OpenStreetMap contributors'
        }
    ).addTo(bhoomiMap);
    // =====================================================
// 🗺️ LOAD PARCELS FROM BHOOMILEDGER DATABASE
// =====================================================

try {

    const parcelResponse =
        await fetch("/api/parcels");

    if (!parcelResponse.ok) {
        throw new Error(
            "Unable to load database parcels"
        );
    }

    const parcelGeoJSON =
        await parcelResponse.json();

    console.log(
        "🗺️ Database parcels:",
        parcelGeoJSON
    );


    // ==========================================
    // CREATE DATABASE PARCEL LAYER
    // ==========================================

    const databaseParcelLayer =
        L.geoJSON(
            parcelGeoJSON,
            {

                style: function (feature) {

                    return {
                        weight: 3,
                        opacity: 1,
                        fillOpacity: 0.25
                    };

                },


                onEachFeature:
                    function (feature, layer) {

                        const p =
                            feature.properties || {};


                        layer.bindPopup(`

                            <div class="parcel-popup">

                                <h3>
                                    🗺️ ${escapeHTML(
                                        p.plot_number ||
                                        "Land Parcel"
                                    )}
                                </h3>

                                <hr>

                                <b>Plot Number:</b>
                                ${escapeHTML(
                                    p.plot_number ||
                                    "Not available"
                                )}

                                <br>

                                <b>Khasra Number:</b>
                                ${escapeHTML(
                                    p.khasra_number ||
                                    "Not available"
                                )}

                                <br>

                                <b>Village:</b>
                                ${escapeHTML(
                                    p.village ||
                                    "Not available"
                                )}

                                <br>

                                <b>Tehsil:</b>
                                ${escapeHTML(
                                    p.tehsil ||
                                    "Not available"
                                )}

                                <br>

                                <b>District:</b>
                                ${escapeHTML(
                                    p.district ||
                                    "Not available"
                                )}

                                <br>

                                <b>State:</b>
                                ${escapeHTML(
                                    p.state ||
                                    "Not available"
                                )}

                                <br>

                                <b>Area:</b>
                                ${escapeHTML(
                                    p.area_sq_m ??
                                    "Not available"
                                )} m²

                                <br>

                                <b>Land Type:</b>
                                ${escapeHTML(
                                    p.land_type ||
                                    "Not available"
                                )}

                                <br>

                                <b>Status:</b>
                                ${escapeHTML(
                                    p.verification_status ||
                                    "unverified"
                                )}

                                <br><br>

                                <small>
                                    🗄️ BhoomiLedger Database Parcel
                                </small>
                           
                            </div>

                        `);
                    
                       layer.on("click", async () => {

    selectedParcelId =
        feature.properties.id;

    console.log(
        "✅ Selected parcel:",
        selectedParcelId
    );
    let ownershipHTML = `
    <hr>
    <b>👤 Current Owner:</b>
    No current owner
`;

    try {
        
         
        const ownershipResponse =
    await fetch(
        `/api/parcels/${selectedParcelId}/ownership`
    );


const ownershipData =
    await ownershipResponse.json();

const currentOwner =
    ownershipData.success
        ? ownershipData.ownership?.find(
            owner => owner.is_current === true
          ) || null
        : null;
        ownershipHTML = `
    <hr>
    <b>👤 Current Owner:</b>
    ${
        currentOwner
            ? `${escapeHTML(
                currentOwner.owner?.full_name ||
                currentOwner.owner_profile_id
              )} (${currentOwner.ownership_percentage}%)`
            : "No current owner"
    }
`;

        const response =
            await fetch(
                `/api/parcels/${selectedParcelId}/documents`
            );

        const result =
            await response.json();

        if (
            !response.ok ||
            !result.success
        ) {
            throw new Error(
                result.error ||
                "Could not load documents."
            );
        }

        const documents =
            result.documents || [];

        let documentsHTML = "";
       
    


        if (documents.length === 0) {

            documentsHTML = `
                <hr>
                <b>📄 Documents</b>
                <p>No documents uploaded yet.</p>
            `;

        } else {

            documentsHTML = `
                <hr>
                <b>📄 Documents</b>
            `;

            documents.forEach(doc => {

                documentsHTML += `
                    <div
                        style="
                            margin-top:8px;
                            padding:8px;
                            border:1px solid #ddd;
                            border-radius:6px;
                        "
                    >
                        <div>
                            <b>
                                ${escapeHTML(doc.title)}
                            </b>
                        </div>

                        <div>
                            Status:
                            <b>
                                ${escapeHTML(
                                    doc.verification_status
                                )}
                            </b>
                        </div>

                        <button
                            onclick="
                                window.viewLandDocument(
                                    '${doc.id}'
                                )
                            "
                        >
                            View
                        </button>
                    </div>
                `;
            });
        }

        const p =
            feature.properties || {};

        layer.setPopupContent(`
            <div class="parcel-popup">

                <b>
                    Plot:
                    ${escapeHTML(
                        p.plot_number || "N/A"
                    )}
                </b>

                <br>

                Khasra:
                ${escapeHTML(
                    p.khasra_number || "N/A"
                )}

                <br>

                Village:
                ${escapeHTML(
                    p.village || "N/A"
                )}

                <br>

                District:
                ${escapeHTML(
                    p.district || "N/A"
                )}
               ${ownershipHTML}
                ${documentsHTML}

            </div>
        `);

    } catch (error) {

        console.error(
            "Document loading error:",
            error
        );

    }
   
});
                    }

            }
        )
        .addTo(bhoomiMap);


    // ==========================================
    // ZOOM TO DATABASE PARCELS
    // ==========================================

    const databaseBounds =
        databaseParcelLayer.getBounds();

    if (databaseBounds.isValid()) {

        bhoomiMap.fitBounds(
            databaseBounds,
            {
                padding: [40, 40],
                maxZoom: 17
            }
        );

    }


    console.log(
        `✅ ${parcelGeoJSON.features?.length || 0} database parcel(s) loaded`
    );


} catch (error) {

    console.error(
        "❌ Database parcel loading error:",
        error
    );

}
    // =========================
// GEOJSON INGESTION
// =========================

const geoJsonUpload =
    document.getElementById("geoJsonUpload");

let uploadedGeoJsonLayer = null;
let selectedParcel = null;
let selectedParcelLayer = null;
const parcelImagery = new Map();
const parcelBaseConfidence = new Map();
const parcelBuildingValidation = new Map();
const imageryUpload =
    document.getElementById("imageryUpload");

const imageryType =
    document.getElementById("imageryType");
    
// ==========================================
// NORMALIZE KHASRA NUMBER
// ==========================================
// ==========================================
// NORMALIZE KHASRA NUMBER
// ==========================================

function normalizeKhasra(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "");
}


// ==========================================
// GET KHASRA LIST
// ==========================================

function getKhasraList(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return [];
    }

    return String(value)
        .split(/[,;\n]+/)
        .map(item =>
            normalizeKhasra(item)
        )
        .filter(Boolean);
}


// ==========================================
// NORMALIZE OTHER MATCHING FIELDS
// ==========================================

function normalizeMatchText(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
}

// ==========================================
// BUILD REVENUE MATCH CANDIDATE
// ==========================================

function buildRevenueCandidate(
    properties,
    record
) {

    const cadastralKhasra =

        properties.khasra_number ||

        properties.khasra ||

        properties.khasra_no ||

        "";


    const cadastralKhasras =
        getKhasraList(
            cadastralKhasra
        );


    const revenueKhasras =
        getKhasraList(
            record.khasra_number
        );


    const khasraMatched =
        cadastralKhasras.some(
            khasra =>
                revenueKhasras.includes(
                    khasra
                )
        );


    if (!khasraMatched) {
        return null;
    }


    // Khasra match gives the base score
    let score = 50;

    const matchedSignals = [
        "Khasra"
    ];

    const mismatchedSignals = [];


    const checks = [

        {
            label: "Khata",
            cadastral:
                properties.khata_number ||
                properties.khata,
            revenue:
                record.khata_number,
            weight: 15
        },

        {
            label: "State",
            cadastral:
                properties.state,
            revenue:
                record.state,
            weight: 10
        },

        {
            label: "District",
            cadastral:
                properties.district,
            revenue:
                record.district,
            weight: 10
        },

        {
            label: "Village",
            cadastral:
                properties.village,
            revenue:
                record.village,
            weight: 10
        },

        {
            label: "Tehsil",
            cadastral:
                properties.tehsil,
            revenue:
                record.tehsil,
            weight: 5
        },

        {
            label: "Recorded Holder",
            cadastral:
                properties.recorded_holder ||
                properties.owner ||
                properties.owner_name,
            revenue:
                record.recorded_holder,
            weight: 5
        }

    ];


    checks.forEach(check => {

        const cadastralValue =
            normalizeMatchText(
                check.cadastral
            );

        const revenueValue =
            normalizeMatchText(
                check.revenue
            );


        // Ignore field if one source
        // does not contain it.
        if (
            !cadastralValue ||
            !revenueValue
        ) {
            return;
        }


        if (
            cadastralValue ===
            revenueValue
        ) {

            score += check.weight;

            matchedSignals.push(
                check.label
            );

        } else {

            score -= Math.ceil(
                check.weight / 2
            );

            mismatchedSignals.push(
                check.label
            );

        }

    });


    score =
        Math.max(
            0,
            Math.min(100, score)
        );


    return {

        record,

        score,

        matchedSignals,

        mismatchedSignals

    };
}
function parseAreaToSquareMeters(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return null;
    }


    if (
        typeof value === "number" &&
        Number.isFinite(value)
    ) {
        return value;
    }


    const text =
        String(value)
            .trim()
            .toLowerCase();


    const match =
        text.match(
            /(\d+(?:\.\d+)?)/
        );


    if (!match) {
        return null;
    }


    const number =
        Number(match[1]);


    if (!Number.isFinite(number)) {
        return null;
    }


    // Hectare
    if (
        text.includes("hectare") ||
        text.includes("hectares") ||
        text.includes(" ha")
    ) {

        return number * 10000;

    }


    // Acre
    if (
        text.includes("acre") ||
        text.includes("acres")
    ) {

        return number * 4046.8564224;

    }


    // Square feet
    if (
        text.includes("sq ft") ||
        text.includes("sqft") ||
        text.includes("square feet")
    ) {

        return number * 0.09290304;

    }


    // Square metre
    if (
        text.includes("m²") ||
        text.includes("m2") ||
        text.includes("sqm") ||
        text.includes("sq m") ||
        text.includes("square metre") ||
        text.includes("square meter")
    ) {

        return number;

    }


    return null;
}
 function updateHarmonizationDashboard({
    parcelName,
    duplicateCount = 0,
    areaConflict = false,
    areaDifferencePercent = null,
    buildingConflict = false,
    newBuildings = [],
    topologyValid = true,
    confidence = null,
    confidenceLevel = "",
    status = ""
}) {

    const results =
        document.getElementById(
            "harmonizationResults"
        );

    if (!results) return;


    const duplicateText =
        duplicateCount > 0
            ? `⚠️ ${duplicateCount} duplicate record(s)`
            : "✅ No duplicate records";


    const areaText =
        areaConflict
            ? `⚠️ Conflict ${
                areaDifferencePercent !== null
                    ? `(${areaDifferencePercent.toFixed(2)}%)`
                    : ""
            }`
            : "✅ No area conflict";


    const buildingText =
        buildingConflict
            ? "⚠️ Boundary conflict detected"
            : "✅ No building boundary conflict";


    const changeText =
        newBuildings.length > 0
            ? `🏠 New building(s): ${newBuildings.join(", ")}`
            : "✅ No new building detected";


    const topologyText =
        topologyValid
            ? "✅ Valid"
            : "⚠️ Conflict detected";


    const safeParcelId =
    String(parcelName)
        .replace(/[^a-zA-Z0-9_-]/g, "_");

let parcelCard =
    document.getElementById(
        `harmonization-${safeParcelId}`
    );

if (!parcelCard) {

    parcelCard =
        document.createElement("div");

    parcelCard.className =
        "harmonization-card";

    parcelCard.id =
        `harmonization-${safeParcelId}`;

    results.appendChild(parcelCard);
}

parcelCard.innerHTML = `

        <h4>
            🧩 ${escapeHTML(parcelName)}
        </h4>

            <div class="harmonization-row">
                <span class="harmonization-label">
                    Duplicate Revenue
                </span>

                <span class="harmonization-value">
                    ${duplicateText}
                </span>
            </div>

            <div class="harmonization-row">
                <span class="harmonization-label">
                    Area Validation
                </span>

                <span class="harmonization-value">
                    ${areaText}
                </span>
            </div>

            <div class="harmonization-row">
                <span class="harmonization-label">
                    Building Validation
                </span>

                <span class="harmonization-value">
                    ${buildingText}
                </span>
            </div>

            <div class="harmonization-row">
                <span class="harmonization-label">
                    Change Detection
                </span>

                <span class="harmonization-value">
                    ${changeText}
                </span>
            </div>

            <div class="harmonization-row">
                <span class="harmonization-label">
                    Topology
                </span>

                <span class="harmonization-value">
                    ${topologyText}
                </span>
            </div>

            ${
                confidence !== null
                    ? `
                        <div class="harmonization-confidence">
                            🎯 Confidence:
                            ${confidence}%
                            ${escapeHTML(confidenceLevel)}
                        </div>
                    `
                    : ""
            }

            ${
                status
                    ? `
                        <div class="harmonization-status">
                            Status:
                            ${escapeHTML(status)}
                        </div>
                    `
                    : ""
            }

        
    `;
}
if (geoJsonUpload) {

    geoJsonUpload.addEventListener(
        "change",
        async function (event) {

            const file =
                event.target.files[0];

            if (!file) {
                return;
            }


            try {

                // ==================================
                // READ GEOJSON FILE
                // ==================================

                const fileText =
                    await file.text();

                const geoJsonData =
                    JSON.parse(fileText);


                // ==================================
                // LOAD REVENUE RECORDS
                // ==================================

                const recordsResponse =
                    await fetch("/records");

                const recordsData =
                    await recordsResponse.json();


                if (!recordsResponse.ok) {

                    throw new Error(
                        recordsData.error ||
                        "Unable to load revenue records"
                    );

                }


                const revenueRecords =

                    Array.isArray(recordsData)
                        ? recordsData

                        : Array.isArray(
                            recordsData.records
                        )
                            ? recordsData.records
                            : [];


                console.log(
                    "📚 Revenue records available:",
                    revenueRecords.length
                );


                // ==================================
                // REMOVE PREVIOUS GEOJSON
                // ==================================

                if (uploadedGeoJsonLayer) {

                    bhoomiMap.removeLayer(
                        uploadedGeoJsonLayer
                    );

                }


                // ==================================
                // CREATE GEOJSON LAYER
                // ==================================

                uploadedGeoJsonLayer =
                    L.geoJSON(
                        geoJsonData,
                        {

                            onEachFeature:
                                function (
                                    feature,
                                    layer
                                ) {

                                    const properties =
                                        feature.properties ||
                                        {};


                                    // =========================
                                    // PARCEL NAME
                                    // =========================

                                    const parcelName =

                                        properties.parcel_id ||

                                        properties.khasra_number ||

                                        properties.name ||

                                        "GeoJSON Parcel";
                                    
                                    // =========================
// SELECT PARCEL
// =========================
// ==========================================
// SELECT CADASTRAL PARCEL
// ==========================================

// ==========================================
// SELECT CADASTRAL PARCEL + SHOW IMAGERY
// ==========================================

layer.on("click", function () {

    // Remove old parcel highlight
    if (
        selectedParcelLayer &&
        selectedParcelLayer !== layer
    ) {

        selectedParcelLayer.setStyle({
            weight: 3
        });

    }


    selectedParcel = {
        feature: feature,
        properties: properties,
        parcelName: parcelName
    };


    selectedParcelLayer = layer;


    // Highlight selected parcel
    layer.setStyle({
        weight: 6
    });


    const selectedText =
        document.getElementById(
            "selectedImageryParcel"
        );


    if (selectedText) {

        selectedText.textContent =
            `Selected parcel: ${parcelName}`;

    }


    console.log(
        "📍 Selected parcel:",
        parcelName
    );


    // Open popup first
    layer.openPopup();


    // Wait until Leaflet creates popup HTML
    setTimeout(() => {

        const preview =
            document.querySelector(
                ".parcel-imagery-preview"
            );


        if (!preview) {
            return;
        }


        const storedImagery =
            parcelImagery.get(
                parcelName
            );


        if (!storedImagery) {

            preview.innerHTML = `

                <hr>

                <strong>
                    🛰️ Imagery
                </strong>

                <br><br>

                No Drone / ORI imagery
                attached to this parcel yet.

            `;

            return;
        }


        preview.innerHTML = `

            <hr>

            <strong>
                🛰️ ${
                    storedImagery.type === "ori"
                        ? "ORI Imagery"
                        : "Drone Imagery"
                }
            </strong>

            <br><br>

            <img
                src="${storedImagery.imageURL}"
                alt="Parcel imagery"
                style="
                    width: 100%;
                    max-width: 320px;
                    border-radius: 8px;
                "
            >

            <br><br>

            <small>
                File:
                ${escapeHTML(
                    storedImagery.fileName
                )}
            </small>

        `;


        const unifiedSources =
            document.querySelector(
                ".unified-sources"
            );


        if (unifiedSources) {

            const imageryLabel =
                storedImagery.type === "ori"
                    ? "ORI"
                    : "Drone";


            unifiedSources.textContent =
                `Cadastral + Revenue + ${imageryLabel}`;

        }

    }, 200);

});
                                    // =========================
                                    // GET CADASTRAL KHASRA
                                    // =========================

                                    const cadastralKhasra =

                                        properties.khasra_number ||

                                        properties.khasra ||

                                        properties.khasra_no ||

                                        "";


                                    const normalizedCadastralKhasra =
                                        normalizeKhasra(
                                            cadastralKhasra
                                        );


                                    // =========================
                                    // FIND MATCHING RECORD
                                    // =========================
// =========================
// FIND REVENUE CANDIDATES
// =========================

const candidateMatches =

    revenueRecords

        .map(record =>
            buildRevenueCandidate(
                properties,
                record
            )
        )

        .filter(Boolean)

        .sort(
            (a, b) =>
                b.score - a.score
        );


// =========================
// CHOOSE BEST CANDIDATE
// =========================

let matchedCandidate = null;

let matchedRecord = null;

let matchState = "none";

let bestCandidates = [];


if (candidateMatches.length > 0) {

    const bestScore =
        candidateMatches[0].score;


    bestCandidates =
        candidateMatches.filter(
            candidate =>
                candidate.score ===
                bestScore
        );


    if (bestCandidates.length === 1) {

        matchedCandidate =
            bestCandidates[0];

        matchedRecord =
            matchedCandidate.record;

        matchState = "matched";

    } else {

        matchState = "ambiguous";

    }

}

                                    // =========================
                                    // CADASTRAL ATTRIBUTES
                                    // =========================

                                    let cadastralHTML = "";


                                    Object.entries(
                                        properties
                                    )
                                    .slice(0, 12)
                                    .forEach(
                                        ([key, value]) => {

                                            cadastralHTML += `

                                                <b>
                                                    ${escapeHTML(key)}
                                                </b>:

                                                ${escapeHTML(
                                                    value ??
                                                    "Not available"
                                                )}

                                                <br>
                                            `;

                                        }
                                    );


                                    // =========================
                                    // REVENUE MATCH RESULT
                                    // =========================

                                    let revenueHTML = "";


// ==========================================
// UNIQUE MATCH
// ==========================================

if (matchState === "matched") {

    revenueHTML = `

        <hr>

        <strong>
            ✅ Revenue Record Matched
        </strong>

        <br><br>

        <b>Recorded Holder:</b>
        ${escapeHTML(
            matchedRecord.recorded_holder ||
            "Not available"
        )}

        <br>

        <b>Khata Number:</b>
        ${escapeHTML(
            matchedRecord.khata_number ||
            "Not available"
        )}

        <br>

        <b>Khasra Number:</b>
        ${escapeHTML(
            matchedRecord.khasra_number ||
            "Not available"
        )}

        <br>

        <b>Land Area:</b>
        ${escapeHTML(
            matchedRecord.land_area ||
            "Not available"
        )}

        <br>

        <b>Village:</b>
        ${escapeHTML(
            matchedRecord.village ||
            "Not available"
        )}

        <br>

        <b>District:</b>
        ${escapeHTML(
            matchedRecord.district ||
            "Not available"
        )}

        <br>

        <b>State:</b>
        ${escapeHTML(
            matchedRecord.state ||
            "Not available"
        )}

        <br><br>

        <b>Matched signals:</b>

        ${matchedCandidate
            .matchedSignals
            .map(signal =>
                escapeHTML(signal)
            )
            .join(", ")}

        <br>

        <b>Candidate score:</b>
        ${matchedCandidate.score}

    `;


    console.log(
        "🔗 Best parcel match:",
        parcelName,
        matchedRecord.khasra_number,
        matchedCandidate.score
    );

}


// ==========================================
// AMBIGUOUS / DUPLICATE MATCH
// ==========================================

else if (matchState === "ambiguous") {

    // Group candidates by property_key

    const propertyKeyGroups =
        new Map();

    let noPropertyKeyCount = 0;


    bestCandidates.forEach(candidate => {

        const rawPropertyKey =
            candidate.record.property_key;

        const normalizedPropertyKey =
            normalizeMatchText(
                rawPropertyKey
            );


        if (!normalizedPropertyKey) {

            noPropertyKeyCount++;

            return;
        }


        if (
            !propertyKeyGroups.has(
                normalizedPropertyKey
            )
        ) {

            propertyKeyGroups.set(
                normalizedPropertyKey,
                {
                    propertyKey:
                        rawPropertyKey,

                    candidates: []
                }
            );

        }


        propertyKeyGroups
            .get(normalizedPropertyKey)
            .candidates
            .push(candidate);

    });


    // Find property keys that occur
    // more than once

    const duplicateGroups =

        Array.from(
            propertyKeyGroups.values()
        )
        .filter(
            group =>
                group.candidates.length > 1
        );


    // ======================================
    // DUPLICATE RECORDS DETECTED
    // ======================================

    if (duplicateGroups.length > 0) {

        const duplicateCount =

            duplicateGroups.reduce(
                (total, group) =>
                    total +
                    group.candidates.length,
                0
            );
            // ======================================
// LOGICAL REVENUE PROPERTY
// ======================================

// Pick the largest group of records
// sharing the same property_key.

const logicalPropertyGroup =

    [...duplicateGroups]
        .sort(
            (a, b) =>
                b.candidates.length -
                a.candidates.length
        )[0];


const logicalRecords =

    logicalPropertyGroup

        ? logicalPropertyGroup
            .candidates
            .map(candidate =>
                candidate.record
            )

        : [];


// ======================================
// GET REVENUE AREA VALUES
// ======================================

const revenueAreaValues =

    logicalRecords

        .map(record =>
            parseAreaToSquareMeters(
                record.land_area
            )
        )

        .filter(area =>
            area !== null
        );


// Remove repeated identical areas

const uniqueRevenueAreas =

    [...new Set(
        revenueAreaValues.map(
            area =>
                Number(
                    area.toFixed(2)
                )
        )
    )];


// ======================================
// GET CADASTRAL AREA
// ======================================

const cadastralArea =

    parseAreaToSquareMeters(
        properties.area_m2
    );

    // ======================================
// AREA CONFLICT ANALYSIS
// ======================================
// ======================================
// INTEGRATION CONFIDENCE
// ======================================

let integrationConfidence = 70;

// Duplicate records reduce confidence
integrationConfidence -= 15;

// Missing property key reduces confidence
if (noPropertyKeyCount > 0) {
    integrationConfidence -= 5;
}
let areaAnalysisHTML = "";
let dashboardAreaConflict = false;
let dashboardAreaDifferencePercent = null;

// ======================================
// CASE 1:
// ONE CONSISTENT REVENUE AREA
// ======================================

if (
    cadastralArea !== null &&
    uniqueRevenueAreas.length === 1
) {

    const revenueArea =
        uniqueRevenueAreas[0];


    const areaDifference =
        Math.abs(
            cadastralArea -
            revenueArea
        );


    const differencePercent =

        revenueArea > 0

            ? (
                areaDifference /
                revenueArea
            ) * 100

            : null;


    // MVP DEMO THRESHOLD
    // More than 5% = conflict

    const hasAreaConflict =

        differencePercent !== null &&                       
        differencePercent > 5; 
        dashboardAreaConflict =
    hasAreaConflict;

dashboardAreaDifferencePercent =
    differencePercent;                                                 
        if (hasAreaConflict) {

    integrationConfidence -= 20;

} else {

    integrationConfidence += 20;

}

    areaAnalysisHTML = `

        <br><br>

        <strong>
            📐 AREA VALIDATION
        </strong>

        <br><br>

        <b>Cadastral Area:</b>
        ${cadastralArea.toFixed(2)} m²

        <br>

        <b>Revenue Area:</b>
        ${revenueArea.toFixed(2)} m²

        <br>

        <b>Difference:</b>
        ${areaDifference.toFixed(2)} m²

        <br>

        <b>Difference %:</b>
        ${
            differencePercent !== null
                ? differencePercent.toFixed(2)
                : "Not available"
        }%

        <br><br>

        ${
            hasAreaConflict

                ? `
                    <strong>
                        ⚠️ AREA CONFLICT DETECTED
                    </strong>

                    <br>

                    Cadastral and revenue
                    area values differ by
                    more than the current
                    5% MVP tolerance.
                `

                : `
                    <strong>
                        ✅ Area values are consistent
                    </strong>

                    <br>

                    Difference is within
                    the current 5% MVP
                    tolerance.
                `
        }

    `;


    console.log(
        "📐 Area comparison:",
        parcelName,
        {
            cadastralArea,
            revenueArea,
            areaDifference,
            differencePercent,
            hasAreaConflict
        }
    );

}


// ======================================
// CASE 2:
// DUPLICATE RECORDS DISAGREE ON AREA
// ======================================

else if (
    uniqueRevenueAreas.length > 1
) {
     integrationConfidence -= 20;
    areaAnalysisHTML = `

        <br><br>

        <strong>
            ⚠️ REVENUE AREA INCONSISTENCY
        </strong>

        <br><br>

        Duplicate revenue records
        representing the same property
        contain different land-area values.

        <br><br>

        BhoomiLedger will not perform
        cadastral area validation until
        this source conflict is reviewed.

    `;


    console.warn(
        "⚠️ Revenue area inconsistency:",
        parcelName,
        uniqueRevenueAreas
    );

}


// ======================================
// CASE 3:
// AREA CANNOT BE COMPARED
// ======================================

else {

    integrationConfidence -= 10;
    areaAnalysisHTML = `

        <br><br>

        <strong>
            ℹ️ Area comparison unavailable
        </strong>

        <br>

        BhoomiLedger could not safely
        normalize both cadastral and
        revenue area values.

    `;


    console.log(
        "ℹ️ Area comparison unavailable:",
        parcelName
    );

}   
        // ======================================
// FINAL CONFIDENCE SCORE
// ======================================

integrationConfidence =
    Math.max(
        0,
        Math.min(
            100,
            Math.round(
                integrationConfidence
            )
        )
    );
parcelBaseConfidence.set(
    parcelName,
    integrationConfidence
);

let confidenceLevel = "Low";

if (integrationConfidence >= 80) {

    confidenceLevel = "High";

} else if (integrationConfidence >= 60) {

    confidenceLevel = "Medium";

}


const confidenceHTML = `

    <br><br>

    <strong>
        🎯 Integration Confidence
    </strong>

    <br><br>

    <b>
        ${integrationConfidence}%
    </b>

    (${confidenceLevel})

    <br><br>

    <small>
        Demo confidence based on
        matching quality, duplicate records,
        property identifiers and area agreement.
    </small>

`;
// ==========================================
// UPDATE HARMONIZATION DASHBOARD
// ==========================================


// ======================================
// UNIFIED PARCEL SUMMARY
// ======================================

let unifiedStatus = "Review Required";

if (integrationConfidence >= 80) {

    unifiedStatus = "High Confidence";

} else if (integrationConfidence >= 60) {

    unifiedStatus = "Needs Verification";

}
// ==========================================
// SEND CURRENT PARCEL RESULTS TO DASHBOARD
// ==========================================

updateHarmonizationDashboard({

    parcelName: parcelName,

    duplicateCount:
        duplicateCount,

    areaConflict:
    dashboardAreaConflict,

areaDifferencePercent:
    dashboardAreaDifferencePercent,

    buildingConflict:
        parcelBuildingValidation.get(
            parcelName
        )?.hasBoundaryConflict || false,

    newBuildings:
        [],

    topologyValid:
        true,

    confidence:
        integrationConfidence,

    confidenceLevel:
        confidenceLevel,

    status:
        unifiedStatus

});

const unifiedParcelHTML = `

    <br><br>

    <hr>

    <strong>
        🧩 UNIFIED PARCEL
    </strong>

    <br><br>

    <b>Parcel ID:</b>
    ${escapeHTML(
        parcelName
    )}

    <br>

    <b>Khasra:</b>
    ${escapeHTML(
        cadastralKhasra ||
        "Not available"
    )}

    <br>
<b>Sources Integrated:</b>

<span
    class="unified-sources"
    data-parcel="${escapeHTML(parcelName)}"
>
    Cadastral + Revenue
</span>

<br>

<b>Building Footprint:</b>

<span
    class="unified-building-status"
    data-parcel="${escapeHTML(parcelName)}"
>
    Not checked yet
</span>

    <br>

    <b>Cadastral Geometry:</b>
    Available

    <br>

    <b>Linked Revenue Records:</b>
    ${logicalRecords.length}

    <br>

    <b>Duplicate Records:</b>
    ${duplicateCount}

    <br>

  <b>Confidence:</b>

<span
    class="unified-confidence"
    data-parcel="${escapeHTML(parcelName)}"
>
    ${integrationConfidence}% (${confidenceLevel})
</span>

<br>

<b>Status:</b>

<span
    class="unified-status"
    data-parcel="${escapeHTML(parcelName)}"
>
    ${unifiedStatus}
</span>

`;


        const duplicateDetails =

            duplicateGroups
                .map(group => `

                    <div
                        style="
                            margin-top: 10px;
                            padding-top: 8px;
                            border-top: 1px solid #ccc;
                        "
                    >

                        <b>Property Key:</b>

                        ${escapeHTML(
                            group.propertyKey
                        )}

                        <br>

                        <b>
                            Duplicate records:
                        </b>

                        ${group.candidates.length}

                    </div>

                `)
                .join("");


        revenueHTML = `

            <hr>

            <strong>
                ⚠️ Duplicate Revenue Records Detected
            </strong>

            <br><br>

            BhoomiLedger found

            <b>
                ${bestCandidates.length}
            </b>

            possible revenue records
            for this cadastral parcel.

            <br><br>

            <b>
                ${duplicateCount}
            </b>

            records share the same
            property identifier.

            ${duplicateDetails}

            ${
                noPropertyKeyCount > 0
                    ? `

                        <br>

                        <b>
                            Records without property key:
                        </b>

                        ${noPropertyKeyCount}

                    `
                    : ""
            }

            <br><br>

            <strong>
                Status:
            </strong>

            Review required before
            automatic harmonization.
             ${areaAnalysisHTML}
             ${confidenceHTML}
            ${unifiedParcelHTML}
        `;


        console.warn(
            "♻️ Duplicate revenue records detected:",
            parcelName,
            "Candidates:",
            bestCandidates.length,
            "Duplicate records:",
            duplicateCount,
            "No property key:",
            noPropertyKeyCount
        );

    }


    // ======================================
    // AMBIGUOUS BUT NOT DUPLICATE
    // ======================================

    else {

        revenueHTML = `

            <hr>

            <strong>
                ⚠️ Multiple Revenue Candidates
            </strong>

            <br><br>

            BhoomiLedger found

            <b>
                ${bestCandidates.length}
            </b>

            equally strong revenue records.

            <br><br>

            Khasra alone is not enough
            to safely select one record.

            <br><br>

            <b>
                More information needed:
            </b>

            Khata, Village, District,
            State or other matching attributes.

        `;


        console.warn(
            "⚠️ Ambiguous parcel:",
            parcelName,
            bestCandidates.length,
            "candidates"
        );

    }

}

// ==========================================
// NO MATCH
// ==========================================

else {

    revenueHTML = `

        <hr>

        <strong>
            ⚠️ No Revenue Match
        </strong>

        <br><br>

        No saved revenue record
        matches Khasra:

        <b>
            ${escapeHTML(
                cadastralKhasra ||
                "Not available"
            )}
        </b>

    `;
    // ==========================================
// DASHBOARD - NO REVENUE MATCH
// ==========================================

updateHarmonizationDashboard({

    parcelName: parcelName,

    duplicateCount:
        0,

    areaConflict:
        false,

    areaDifferencePercent:
        null,

    buildingConflict:
        parcelBuildingValidation.get(
            parcelName
        )?.hasBoundaryConflict || false,

    newBuildings:
        [],

    topologyValid:
        true,

    confidence:
        40,

    confidenceLevel:
        "Low",

    status:
        "Review Required"

});
   
    console.log(
        "⚠️ No match for parcel:",
        parcelName,
        "Khasra:",
        cadastralKhasra
    );

}

                                    // =========================
                                    // FINAL PARCEL POPUP
                                    // =========================

                                    layer.bindPopup(`

                                        <div>

                                            <strong>
                                                ${escapeHTML(
                                                    parcelName
                                                )}
                                            </strong>

                                            <br><br>
                                            <div class="parcel-imagery-preview"></div>
                                            <b>
                                                CADASTRAL SOURCE
                                            </b>

                                            <br><br>

                                            ${cadastralHTML}


                                            ${revenueHTML}


                                            <br><br>

                                            <small>
                                                Cadastral geometry:
                                                Uploaded GeoJSON

                                                <br>

                                                Revenue data:
                                                BhoomiLedger database
                                            </small>

                                        </div>
                                    `, {
    maxWidth: 380,
    maxHeight: 350,
    autoPan: true,
    keepInView: true
} 
                                );

                                }

                        }
                    )
                    .addTo(bhoomiMap);


                // ==================================
                // ZOOM TO GEOJSON
                // ==================================
// ==========================================
// CADASTRAL TOPOLOGY VALIDATION
// Detect overlapping parcel polygons
// ==========================================

const cadastralFeatures =
    geoJsonData.features.filter(
        feature =>
            feature.geometry &&
            (
                feature.geometry.type === "Polygon" ||
                feature.geometry.type === "MultiPolygon"
            )
    );

const topologyConflicts = [];


// Compare every parcel with every other parcel
for (
    let i = 0;
    i < cadastralFeatures.length;
    i++
) {

    for (
        let j = i + 1;
        j < cadastralFeatures.length;
        j++
    ) {

        const parcelA =
            cadastralFeatures[i];

        const parcelB =
            cadastralFeatures[j];


        const parcelAName =
            parcelA.properties?.parcel_id ||
            parcelA.properties?.khasra_number ||
            `Parcel ${i + 1}`;


        const parcelBName =
            parcelB.properties?.parcel_id ||
            parcelB.properties?.khasra_number ||
            `Parcel ${j + 1}`;


        try {

            const overlap =
                turf.intersect(
                    turf.featureCollection([
                        parcelA,
                        parcelB
                    ])
                );


            if (overlap) {

                const overlapArea =
                    turf.area(overlap);


                // Ignore zero-area boundary touching
                if (overlapArea > 0.01) {

                    topologyConflicts.push({
                        parcelA: parcelAName,
                        parcelB: parcelBName,
                        overlapArea: overlapArea
                    });


                    console.warn(
                        "⚠️ TOPOLOGY CONFLICT:",
                        parcelAName,
                        "overlaps",
                        parcelBName,
                        "Area:",
                        overlapArea.toFixed(2),
                        "m²"
                    );

                }

            }

        } catch (error) {

            console.error(
                "Topology validation error:",
                parcelAName,
                parcelBName,
                error
            );

        }

    }

}


// ==========================================
// TOPOLOGY VALIDATION RESULT
// ==========================================

if (topologyConflicts.length === 0) {

    console.log(
        "✅ Topology validation passed: No cadastral overlaps detected."
    );

} else {

    console.warn(
        `⚠️ ${topologyConflicts.length} cadastral topology conflict(s) detected.`,
        topologyConflicts
    );

}
                const bounds =
                    uploadedGeoJsonLayer
                        .getBounds();


                if (bounds.isValid()) {

                    bhoomiMap.fitBounds(
                        bounds,
                        {
                            padding: [30, 30]
                        }
                    );

                }


                console.log(
                    "🌍 GeoJSON loaded:",
                    file.name
                );


            } catch (error) {

                console.error(
                    "GeoJSON loading error:",
                    error
                );


                alert(
                    "Could not load GeoJSON or revenue records."
                );

            }

        }
    );

}
// =========================
// DRONE / ORI IMAGE UPLOAD
// =========================

if (imageryUpload) {

    imageryUpload.addEventListener(
        "change",
        function (event) {

            const file =
                event.target.files[0];

            if (!file) {
                return;
            }


            if (!selectedParcel) {

                alert(
                    "Please select a cadastral parcel first."
                );

                imageryUpload.value = "";

                return;
            }


            const sourceType =
                imageryType
                    ? imageryType.value
                    : "drone";


            const imageURL =
                URL.createObjectURL(file);


            selectedParcel.imagery = {

                fileName:
                    file.name,

                type:
                    sourceType,

                imageURL:
                    imageURL

            };
            parcelImagery.set(
    selectedParcel.parcelName,
    {
        fileName: file.name,
        type: sourceType,
        imageURL: imageURL
    }
);
// ======================================
// UPDATE UNIFIED PARCEL SOURCES
// ======================================

const unifiedSources =
    document.querySelector(
        ".unified-sources"
    );

if (unifiedSources) {

    const imageryLabel =
        sourceType === "ori"
            ? "ORI"
            : "Drone";

    unifiedSources.textContent =
        `Cadastral + Revenue + ${imageryLabel}`;

}
            // Show uploaded imagery in the open parcel popup

if (selectedParcelLayer) {

    selectedParcelLayer.openPopup();

    setTimeout(() => {

        const preview =
            document.querySelector(
                ".parcel-imagery-preview"
            );

        if (!preview) {
            return;
        }

        preview.innerHTML = `

            <hr>

            <strong>
                🛰️ ${
                    sourceType === "ori"
                        ? "ORI Imagery"
                        : "Drone Imagery"
                }
            </strong>

            <br><br>

            <img
                src="${imageURL}"
                alt="Parcel imagery"
                style="
                    width: 100%;
                    max-width: 320px;
                    border-radius: 8px;
                "
            >

            <br><br>

            <small>
                File:
                ${escapeHTML(file.name)}
            </small>

        `;

    }, 200);

}

            console.log(
                "🛰️ Imagery attached:",
                {
                    parcel:
                        selectedParcel.parcelName,

                    type:
                        sourceType,

                    file:
                        file.name
                }
            );


            alert(
                `${sourceType.toUpperCase()} image attached to ${selectedParcel.parcelName}`
            );

        }
    );


}

// =====================================================
// BUILDING FOOTPRINT GEOJSON UPLOAD
// =====================================================

const buildingGeoJsonUpload =
    document.getElementById(
        "buildingGeoJsonUpload"
    );

let buildingFootprintLayer = null;
// ==========================================
// BUILDING CHANGE DETECTION STATE
// ==========================================

let previousBuildingData = null;
const parcelDetectedChanges = new Map();

if (buildingGeoJsonUpload) {

    buildingGeoJsonUpload.addEventListener(
        "change",
        async function (event) {

            const file =
                event.target.files[0];

            if (!file) {
                return;
            }

            try {

                // ======================================
                // READ THE BUILDING GEOJSON FILE
                // ======================================

                const fileText =
                    await file.text();

                const buildingData =
                    JSON.parse(fileText);


                // ======================================
                // BASIC GEOJSON CHECK
                // ======================================

                if (
                    !buildingData ||
                    buildingData.type !== "FeatureCollection" ||
                    !Array.isArray(buildingData.features)
                ) {

                    throw new Error(
                        "Building file must be a GeoJSON FeatureCollection."
                    );

                }


                // ======================================
                // KEEP ONLY POLYGON BUILDINGS
                // ======================================

                const buildingFeatures =
                    buildingData.features.filter(
                        feature => {

                            const geometryType =
                                feature &&
                                feature.geometry &&
                                feature.geometry.type;

                            return (
                                geometryType === "Polygon" ||
                                geometryType === "MultiPolygon"
                            );

                        }
                    );


                if (buildingFeatures.length === 0) {

                    throw new Error(
                        "No Polygon or MultiPolygon building footprints found."
                    );

                }


                const cleanedBuildingData = {
                    type: "FeatureCollection",
                    features: buildingFeatures
                };
                // ==========================================
// BUILDING CHANGE DETECTION
// Compare previous upload with current upload
// ==========================================

if (previousBuildingData) {

    const previousIds =
        new Set(
            previousBuildingData.features
                .map(feature =>
                    feature.properties?.building_id ||
                    feature.properties?.id ||
                    feature.properties?.name
                )
                .filter(Boolean)
        );


    const currentIds =
        new Set(
            cleanedBuildingData.features
                .map(feature =>
                    feature.properties?.building_id ||
                    feature.properties?.id ||
                    feature.properties?.name
                )
                .filter(Boolean)
        );


    const newBuildings =
        [...currentIds].filter(
            id => !previousIds.has(id)
        );


    const removedBuildings =
        [...previousIds].filter(
            id => !currentIds.has(id)
        );


    if (
        newBuildings.length === 0 &&
        removedBuildings.length === 0
    ) {

        console.log(
            "✅ Change detection: No building changes detected."
        );

    } else {

        if (newBuildings.length > 0) {

            console.warn(
                "🏠 New building(s) detected:",
                newBuildings
            );

        }
        // ==========================================
// STORE NEW BUILDINGS BY PARCEL
// ==========================================

if (newBuildings.length > 0) {

    newBuildings.forEach(buildingId => {

        const changedFeature =
            cleanedBuildingData.features.find(
                feature =>
                    (
                        feature.properties?.building_id ||
                        feature.properties?.id ||
                        feature.properties?.name
                    ) === buildingId
            );

        if (!changedFeature) return;


        if (uploadedGeoJsonLayer) {

            uploadedGeoJsonLayer.eachLayer(
                function (parcelLayer) {

                    const parcelFeature =
                        parcelLayer.feature;

                    if (!parcelFeature) return;


                    try {

                        const belongsToParcel =
                            turf.booleanWithin(
                                changedFeature,
                                parcelFeature
                            ) ||
                            turf.booleanIntersects(
                                changedFeature,
                                parcelFeature
                            );


                        if (belongsToParcel) {

                            const changedParcelName =
                                parcelFeature.properties?.parcel_id ||
                                parcelFeature.properties?.khasra_number ||
                                parcelFeature.properties?.name;


                            if (!changedParcelName) {
                                return;
                            }


                            const existingChanges =
                                parcelDetectedChanges.get(
                                    changedParcelName
                                ) || [];


                            if (
                                !existingChanges.includes(
                                    buildingId
                                )
                            ) {

                                existingChanges.push(
                                    buildingId
                                );

                            }


                            parcelDetectedChanges.set(
                                changedParcelName,
                                existingChanges
                            );

                        }

                    } catch (error) {

                        console.error(
                            "Change detection parcel match error:",
                            error
                        );

                    }

                }
            );

        }

    });

}
        // ==========================================
// UPDATE DASHBOARD WITH CHANGE DETECTION
// ==========================================

if (newBuildings.length > 0) {

    newBuildings.forEach(buildingId => {

        const changedFeature =
            cleanedBuildingData.features.find(
                feature =>
                    (
                        feature.properties?.building_id ||
                        feature.properties?.id ||
                        feature.properties?.name
                    ) === buildingId
            );

        if (!changedFeature) {
            return;
        }

        let changedParcelName = null;

        if (uploadedGeoJsonLayer) {

            uploadedGeoJsonLayer.eachLayer(
                function (parcelLayer) {

                    if (changedParcelName) {
                        return;
                    }

                    const parcelFeature =
                        parcelLayer.feature;

                    if (!parcelFeature) {
                        return;
                    }

                    try {

                        if (
                            turf.booleanWithin(
                                changedFeature,
                                parcelFeature
                            ) ||
                            turf.booleanIntersects(
                                changedFeature,
                                parcelFeature
                            )
                        ) {

                            changedParcelName =
                                parcelFeature.properties?.parcel_id ||
                                parcelFeature.properties?.khasra_number ||
                                parcelFeature.properties?.name ||
                                null;

                        }

                    } catch (error) {

                        console.error(
                            "Change detection parcel match error:",
                            error
                        );

                    }

                }
            );

        }


        if (changedParcelName) {

            const existingCard =
                document.getElementById(
                    `harmonization-${String(
                        changedParcelName
                    ).replace(
                        /[^a-zA-Z0-9_-]/g,
                        "_"
                    )}`
                );


            if (existingCard) {

                const rows =
                    existingCard.querySelectorAll(
                        ".harmonization-row"
                    );

                rows.forEach(row => {

                    const label =
                        row.querySelector(
                            ".harmonization-label"
                        );

                    const value =
                        row.querySelector(
                            ".harmonization-value"
                        );

                    if (
                        label &&
                        value &&
                        label.textContent
                            .includes(
                                "Change Detection"
                            )
                    ) {

                        value.textContent =
                            `🏠 New building(s): ${newBuildings.join(", ")}`;

                    }

                });

            }

        }

    });

}

        if (removedBuildings.length > 0) {

            console.warn(
                "🗑️ Removed building(s) detected:",
                removedBuildings
            );

        }

    }

}


// Save current upload as the next "previous" dataset
previousBuildingData =
    JSON.parse(
        JSON.stringify(
            cleanedBuildingData
        )
    );

                // ======================================
                // REMOVE OLD BUILDING LAYER
                // ======================================

                if (buildingFootprintLayer) {

                    bhoomiMap.removeLayer(
                        buildingFootprintLayer
                    );

                }


                // ======================================
                // DRAW BUILDINGS ON THE MAP
                // ======================================

                buildingFootprintLayer =
                    L.geoJSON(
                        cleanedBuildingData,
                        {

                            pane: "buildingPane",

                            style: {
                                color: "#d35400",
                                fillColor: "#f5b041",
                                weight: 3,
                                fillOpacity: 0.55
                            },

                            onEachFeature:
                                function (
                                    feature,
                                    layer
                                ) {

                                    const properties =
                                        feature.properties ||
                                        {};

                                    const buildingName =
                                        properties.building_id ||
                                        properties.name ||
                                        properties.id ||
                                        "Building Footprint";
                                    // ======================================
// SPATIAL VALIDATION
// ======================================

let matchedParcel = null;
let boundaryConflict = false;

if (uploadedGeoJsonLayer) {

    uploadedGeoJsonLayer.eachLayer(
        function (parcelLayer) {

            const parcelFeature =
                parcelLayer.feature;

            if (!parcelFeature) return;

            try {

                // Building completely inside parcel
                if (
                    turf.booleanWithin(
                        feature,
                        parcelFeature
                    )
                ) {

                    matchedParcel =
                        parcelFeature;

                    boundaryConflict =
                        false;

                }

                // Building overlaps/touches parcel
                else if (
                    turf.booleanIntersects(
                        feature,
                        parcelFeature
                    )
                ) {

                    if (!matchedParcel) {

                        matchedParcel =
                            parcelFeature;

                        boundaryConflict =
                            true;

                    }

                }

            }
            catch (error) {

                console.error(
                    "Spatial validation error:",
                    error
                );

            }

        }
    );

}


const parcelProperties =
    matchedParcel?.properties || {};


const matchedParcelName =
    parcelProperties.parcel_id ||
    parcelProperties.khasra_number ||
    parcelProperties.name ||
    "Unknown Parcel";


let spatialStatus =
    "⚠️ No matching cadastral parcel found";


if (
    matchedParcel &&
    !boundaryConflict
) {

    spatialStatus = `
        ✅ Building is fully inside
        <b>${escapeHTML(
            matchedParcelName
        )}</b>
    `;

}
else if (
    matchedParcel &&
    boundaryConflict
) {

    spatialStatus = `
        ⚠️ Building crosses or touches
        cadastral parcel boundary

        <br>

        Parcel:
        <b>${escapeHTML(
            matchedParcelName
        )}</b>
    `;

}

// ======================================
// UPDATE UNIFIED PARCEL BUILDING STATUS
// ======================================

if (matchedParcel) {

    const previousBuildingState =
        parcelBuildingValidation.get(
            matchedParcelName
        ) || {
            buildingCount: 0,
            hasBoundaryConflict: false
        };


    const updatedBuildingState = {

        buildingCount:
            previousBuildingState.buildingCount + 1,

        hasBoundaryConflict:
            previousBuildingState.hasBoundaryConflict ||
            boundaryConflict

    };


    parcelBuildingValidation.set(
        matchedParcelName,
        updatedBuildingState
    );


    // ==================================
    // BUILDING STATUS
    // ==================================

    const buildingStatusElement =
        document.querySelector(
            `.unified-building-status[data-parcel="${CSS.escape(
                matchedParcelName
            )}"]`
        );


    if (buildingStatusElement) {

        if (
            updatedBuildingState.hasBoundaryConflict
        ) {

            buildingStatusElement.innerHTML =
                "⚠️ Building boundary conflict";

        } else {

            buildingStatusElement.innerHTML =
                "✅ Building inside parcel";

        }

    }


    // ==================================
    // ADD BUILDING TO SOURCE LIST
    // ==================================

    const unifiedSourcesElement =
        document.querySelector(
            `.unified-sources[data-parcel="${CSS.escape(
                matchedParcelName
            )}"]`
        );


    if (unifiedSourcesElement) {

        const currentSources =
            unifiedSourcesElement
                .textContent
                .trim();


        if (
            !currentSources.includes(
                "Building"
            )
        ) {

            unifiedSourcesElement.textContent =
                currentSources +
                " + Building";

        }

    }


    // ==================================
    // UPDATE CONFIDENCE
    // ==================================

    const baseConfidence =
        parcelBaseConfidence.get(
            matchedParcelName
        );


    if (
        typeof baseConfidence === "number"
    ) {

        let updatedConfidence =
            baseConfidence;


        // Demo penalty for building
        // crossing cadastral boundary
        if (
            updatedBuildingState
                .hasBoundaryConflict
        ) {

            updatedConfidence -= 15;

        }


        updatedConfidence =
            Math.max(
                0,
                Math.min(
                    100,
                    updatedConfidence
                )
            );


        let updatedConfidenceLevel =
            "Low";


        if (
            updatedConfidence >= 80
        ) {

            updatedConfidenceLevel =
                "High";

        }
        else if (
            updatedConfidence >= 60
        ) {

            updatedConfidenceLevel =
                "Medium";

        }


        let updatedUnifiedStatus =
            "Review Required";


        if (
            updatedConfidence >= 80
        ) {

            updatedUnifiedStatus =
                "High Confidence";

        }
        else if (
            updatedConfidence >= 60
        ) {

            updatedUnifiedStatus =
                "Needs Verification";

        }


        const confidenceElement =
            document.querySelector(
                `.unified-confidence[data-parcel="${CSS.escape(
                    matchedParcelName
                )}"]`
            );


        const statusElement =
            document.querySelector(
                `.unified-status[data-parcel="${CSS.escape(
                    matchedParcelName
                )}"]`
            );


        if (confidenceElement) {

            confidenceElement.textContent =
                `${updatedConfidence}% (${updatedConfidenceLevel})`;

        }


        if (statusElement) {

            statusElement.textContent =
                updatedUnifiedStatus;

        }


        console.log(
            "🎯 Building-adjusted confidence:",
            matchedParcelName,
            updatedConfidence
        );
        // ==========================================
// UPDATE HARMONIZATION DASHBOARD AFTER BUILDING CHECK
// ==========================================

updateHarmonizationDashboard({

    parcelName:
        matchedParcelName,

    duplicateCount:
        matchedParcelName === "CAD-001"
            ? 6
            : 0,

    areaConflict:
        matchedParcelName === "CAD-001",

    areaDifferencePercent:
        matchedParcelName === "CAD-001"
            ? 96
            : null,

    buildingConflict:
        updatedBuildingState
            .hasBoundaryConflict,

   newBuildings:
    parcelDetectedChanges.get(
        matchedParcelName
    ) || [],

    topologyValid:
        true,

    confidence:
        updatedConfidence,

    confidenceLevel:
        updatedConfidenceLevel,

    status:
        updatedUnifiedStatus

});

    }

}
                                    let buildingHTML = "";

                                    Object.entries(
                                        properties
                                    )
                                    .slice(0, 10)
                                    .forEach(
                                        ([key, value]) => {

                                            buildingHTML += `

                                                <b>
                                                    ${escapeHTML(key)}
                                                </b>:

                                                ${escapeHTML(
                                                    value ??
                                                    "Not available"
                                                )}

                                                <br>

                                            `;

                                        }
                                    );


                                    layer.bindPopup(`

    <div>

        <strong>
            🏢 ${escapeHTML(
                buildingName
            )}
        </strong>

        <br><br>

        <b>
            SPATIAL VALIDATION
        </b>

        <br><br>

        ${spatialStatus}

        <br><br>

        <b>
            BUILDING FOOTPRINT SOURCE
        </b>

        <br><br>

        ${
            buildingHTML ||
            "No building attributes available."
        }

        <br><br>

        <small>
            Source:
            Uploaded Building GeoJSON
        </small>

    </div>

`);

                                }

                        }
                    )
                    .addTo(bhoomiMap);


                console.log(
                    "🏢 Building footprints loaded:",
                    file.name,
                    "Count:",
                    buildingFeatures.length
                );


                alert(
                    `${buildingFeatures.length} building footprint(s) loaded.`
                );


            } catch (error) {

                console.error(
                    "🏢 Building GeoJSON error:",
                    error
                );

                alert(
                    "Could not load Building Footprint GeoJSON. " +
                    "Please check that it contains Polygon building features."
                );

            }

        }
    );

}

} // END initializeBhoomiMap()


console.log(
    "🗺️ BhoomiLedger Web GIS loaded"
);

initializeBhoomiMap();
// =====================================================
// 🔐 AUTH UI
// =====================================================

const authModal =
    document.getElementById("authModal");

const openSignupBtn =
    document.getElementById("openSignupBtn");

const openLoginBtn =
    document.getElementById("openLoginBtn");

const closeAuthModal =
    document.getElementById("closeAuthModal");

const authModalTitle =
    document.getElementById("authModalTitle");

const authModalSubtitle =
    document.getElementById("authModalSubtitle");

const authModalIcon =
    document.getElementById("authModalIcon");

const signupNameGroup =
    document.getElementById("signupNameGroup");

const authSubmitBtn =
    document.getElementById("authSubmitBtn");

const authMessage =
    document.getElementById("authMessage");


let authMode = "login";


function openAuthModal(mode) {

    authMode = mode;

    authMessage.textContent = "";

    if (mode === "signup") {

        authModalIcon.textContent = "🌱";
        authModalTitle.textContent =
            "Create BhoomiLedger Account";

        authModalSubtitle.textContent =
            "Create your account to access BhoomiLedger.";

        signupNameGroup.style.display =
            "block";

        authSubmitBtn.textContent =
            "Create Account";

    } else {

        authModalIcon.textContent = "🔐";
        authModalTitle.textContent =
            "Login to BhoomiLedger";

        authModalSubtitle.textContent =
            "Access your BhoomiLedger account.";

        signupNameGroup.style.display =
            "none";

        authSubmitBtn.textContent =
            "Login";
    }

    authModal.classList.add("open");
}


openSignupBtn.addEventListener(
    "click",
    () => openAuthModal("signup")
);


openLoginBtn.addEventListener(
    "click",
    () => openAuthModal("login")
);


closeAuthModal.addEventListener(
    "click",
    () => {
        authModal.classList.remove("open");
    }
);


authModal.addEventListener(
    "click",
    (event) => {

        if (event.target === authModal) {
            authModal.classList.remove("open");
        }

    }
);
// =====================================================
// 🔐 BHOOMILEDGER SIGN UP
// =====================================================

authSubmitBtn.addEventListener(
    "click",
    async () => {
        const email =
            document
                .getElementById("authEmail")
                .value
                .trim();

        const password =
            document
                .getElementById("authPassword")
                .value;

        authSubmitBtn.disabled = true;
        authMessage.textContent = "";

        try {
            if (authMode === "signup") {
                const fullName =
                    document
                        .getElementById("authFullName")
                        .value
                        .trim();

                if (!fullName || !email || !password) {
                    authMessage.textContent =
                        "Please fill in all fields.";
                    return;
                }

                authMessage.textContent =
                    "Creating account...";

                const { data, error } =
                    await supabase.auth.signUp({
                        email,
                        password,
                        options: {
                            data: {
                                full_name: fullName
                            }
                        }
                    });

                if (error) {
                    throw error;
                }

                console.log(
                    "✅ BhoomiLedger user created:",
                    data.user
                );

                authMessage.textContent =
                    data.session
                        ? "✅ Account created successfully!"
                        : "✅ Account created! Check your email to confirm it.";
            }

            if (authMode === "login") {
                if (!email || !password) {
                    authMessage.textContent =
                        "Enter email and password.";
                    return;
                }

                authMessage.textContent =
                    "Logging in...";

                const { data, error } =
                    await supabase.auth.signInWithPassword({
                        email,
                        password
                    });

                if (error) {
                    throw error;
                }

                console.log(
                    "✅ BhoomiLedger login successful:",
                    data.user
                );

                authMessage.textContent =
                    "✅ Login successful!";

                setTimeout(() => {
                    authModal.classList.remove("open");
                }, 500);
            }

        } catch (error) {
            console.error(
                "❌ Auth error:",
                error
            );

            authMessage.textContent =
                error.message ||
                "Authentication failed.";
        } finally {
            authSubmitBtn.disabled = false;
        }
    }
);
async function updateAuthUI() {
    const {
        data: { user }
    } = await supabase.auth.getUser();

    const loggedOutControls =
        document.getElementById("loggedOutControls");

    const loggedInControls =
        document.getElementById("loggedInControls");

    if (!user) {
        loggedOutControls.style.display = "flex";
        loggedInControls.style.display = "none";
        return;
    }

    loggedOutControls.style.display = "none";
    loggedInControls.style.display = "flex";

    document.getElementById(
        "authUserEmail"
    ).textContent = user.email;

    const { data: profile, error } =
        await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

    if (error) {
        console.error(
            "❌ Profile loading error:",
            error
        );

        document.getElementById(
            "authUserRole"
        ).textContent = "user";

        return;
    }

    document.getElementById(
        "authUserRole"
    ).textContent =
        profile.role || "citizen";
}
document
    .getElementById("logoutBtn")
    .addEventListener(
        "click",
        async () => {
            const { error } =
                await supabase.auth.signOut();

            if (error) {
                console.error(
                    "❌ Logout error:",
                    error
                );
                return;
            }

            console.log(
                "✅ BhoomiLedger logout successful"
            );

            await updateAuthUI();
        }
    );
    supabase.auth.onAuthStateChange(
    () => {
        setTimeout(() => {
            updateAuthUI();
        }, 0);
    }
);

updateAuthUI();
window.testCitizenRLS = async function () {
    console.log("=== BhoomiLedger Citizen RLS Test ===");

    // 1. READ
    const readResult = await supabase
        .from("land_parcels")
        .select("id, plot_number")
        .limit(3);

    console.log("READ:", readResult);

    // 2. INSERT
    const insertResult = await supabase
        .from("land_parcels")
        .insert({
            plot_number: "RLS-CITIZEN-TEST",
            village: "Test Village",
            district: "Lucknow",
            state: "Uttar Pradesh",
            verification_status: "unverified"
        })
        .select();

    console.log("INSERT:", insertResult);

// 3. UPDATE
const updateResult = await supabase
    .from("land_parcels")
    .update({
        land_type: "RLS-HACK-TEST"
    })
    .eq("plot_number", "TEST-001")
    .select();

console.log("UPDATE:", updateResult);


// 4. DELETE
const deleteResult = await supabase
    .from("land_parcels")
    .delete()
    .eq("plot_number", "RLS-CITIZEN-TEST")
    .select();

console.log("DELETE:", deleteResult);

}; // ← existing end of testCitizenRLS
window.viewLandDocument =
    async function (documentId) {

        try {
            const ownershipResponse =
    await fetch(
        `/api/parcels/${selectedParcelId}/ownership`
    );
const ownershipData =
    await ownershipResponse.json();

const currentOwner =
    ownershipData.success
        ? ownershipData.ownership?.find(
            owner => owner.is_current === true
          ) || null
        : null;

ownershipHTML = `
    <hr>
    <b>👤 Current Owner:</b>
    ${
        currentOwner
            ? `${escapeHTML(
                currentOwner.owner?.full_name ||
                currentOwner.owner_profile_id
              )} (${currentOwner.ownership_percentage}%)`
            : "No current owner"
    }
`;
const ownershipResult =
    await ownershipResponse.json();



let ownershipHTML = `
    <div>
        <b>👤 Current Owner:</b>
        ${
            currentOwner
                ? `${escapeHTML(
                    currentOwner.owner?.full_name || currentOwner.owner_profile_id  
                  )} (${currentOwner.ownership_percentage}%)`
                : "No current owner"
        }
    </div>
`;

            const response =
                await fetch(
                    `/api/documents/${documentId}/view`
                );

            const result =
                await response.json();

            if (
                !response.ok ||
                !result.success
            ) {
                throw new Error(
                    result.error ||
                    "Could not open document."
                );
            }

            window.open(
                result.url,
                "_blank"
            );

        } catch (error) {

            console.error(
                "View document error:",
                error
            );

            alert(
                "Could not open document."
            );
        }
    };
   
async function loadDocumentHistory() {

    const container =
        document.getElementById("documentHistory");

    if (!container) return;

    try {

        const response =
            await fetch("/api/document-history");

        const data =
            await response.json();

        console.log(
            "📄 DOCUMENT HISTORY:",
            data
        );

        if (!data.success) {
            throw new Error(data.error);
        }

        const documents =
            data.documents || [];

        if (documents.length === 0) {

            container.innerHTML =
                "<p>No uploaded documents yet.</p>";

            return;
        }

        container.innerHTML =
            documents.map(doc => `

                <div class="history-card">

                    <b>
                        📄 ${escapeHTML(doc.title)}
                    </b>

                    <p>
                        Status:
                        ${escapeHTML(
                            doc.verification_status
                        )}
                    </p>

                    <button
                        onclick="window.viewLandDocument('${doc.id}')"
                    >
                        View
                    </button>

                </div>

            `).join("");

    } catch (error) {

        console.error(
            "❌ Document history:",
            error
        );

        container.innerHTML =
            "<p>Unable to load documents.</p>";
    }
}
async function loadTransactions() {
    const container =
        document.getElementById("transactionHistory");

    if (!container) return;

    try {
        const response =
            await fetch("/api/transactions");

        const data =
            await response.json();

        if (!data.success) {
            throw new Error(data.error);
        }

        const transactions =
            data.transactions || [];

        if (transactions.length === 0) {
            container.innerHTML =
                "<p>No transactions yet.</p>";
            return;
        }

        container.innerHTML =
            transactions.map(tx => `

                <div class="history-card">

                    <b>
                        🔄 ${escapeHTML(tx.transaction_type)}
                    </b>

                    <p>
                        Reference:
                        ${escapeHTML(
                            tx.reference_number || "-"
                        )}
                    </p>

                    <p>
                        Ownership:
                        ${tx.ownership_percentage}%
                    </p>

                    <p>
                        Status:
                        ${escapeHTML(tx.status)}
                    </p>

                    ${
                        tx.status === "pending"
                            ? `
                                <button
                                    onclick="window.approveTransaction('${tx.id}')"
                                >
                                    ✅ Approve
                                </button>
                              `
                            : ""
                    }

                </div>

            `).join("");

    } catch (error) {
        console.error(
            "Transaction history error:",
            error
        );

        container.innerHTML =
            "<p>Unable to load transactions.</p>";
    }
}
window.approveTransaction =
async function (transactionId) {

    try {
        const {
            data: { session }
        } =
            await supabase.auth.getSession();

        if (!session) {
            alert("Please login first.");
            return;
        }

        const response =
            await fetch(
                `/api/transactions/${transactionId}/approve`,
                {
                    method: "PATCH",

                    headers: {
                        Authorization:
                            `Bearer ${session.access_token}`
                    }
                }
            );

        const data =
            await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.error ||
                "Approval failed."
            );
        }

        alert(
            "✅ Transaction approved! Ownership transferred."
        );

        loadTransactions();

    } catch (error) {
        console.error(error);

        alert(
            "❌ " + error.message
        );
    }
};

loadTransactions();