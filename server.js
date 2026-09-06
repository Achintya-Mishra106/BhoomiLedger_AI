    require("dotenv").config()
    
    const express = require("express")
    const crypto = require("crypto")
    const multer = require("multer")
    const { PDFParse } = require("pdf-parse")
    const { GoogleGenAI } = require("@google/genai")
    const Groq = require("groq-sdk")
    const supabase = require("./supabase")

    const app = express()

    // ==========================================
    // EXPRESS SETUP
    // ==========================================

    app.use(express.json())
    app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader(
        "Referrer-Policy",
        "strict-origin-when-cross-origin"
    );
    next();
});
    app.use(express.static("."))

    // ==========================================
    // AI CLIENTS
    // ==========================================

    const gemini = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY
    })

    const groq = new Groq({
        apiKey: process.env.GROQ_API_KEY
    })

    // ==========================================
    // FILE UPLOAD
    // ==========================================

    const upload = multer({
        storage: multer.memoryStorage(),
        limits: {
            fileSize: 10 * 1024 * 1024
        }
    })

    // ==========================================
    // CLEAN AI RESPONSE
    // ==========================================

    function cleanAIResponse(text) {
        if (!text) {
            return ""
        }

        return String(text)
            .replace(/<think>[\s\S]*?<\/think>/gi, "")
            .replace(/<thinking>[\s\S]*?<\/thinking>/gi, "")
            .trim()
    }

    // ==========================================
    // EXTRACT JSON FROM AI RESPONSE
    // ==========================================

    function extractJSON(text) {
        if (!text) {
            return null
        }

        const cleaned = cleanAIResponse(text)

        try {
            return JSON.parse(cleaned)
        } catch (error) {
            // Continue
        }

        const match = cleaned.match(/\{[\s\S]*\}/)

        if (!match) {
            return null
        }

        try {
            return JSON.parse(match[0])
        } catch (error) {
            return null
        }
    }

    // ==========================================
    // CLEAN STRUCTURED DATA
    // ==========================================

    function cleanStructuredData(data) {
        if (!data) {
            return null
        }

        if (data.answer) {
            data.answer = cleanAIResponse(data.answer)
        }

        return data
    }

   // ==========================================
// SAVE LAND RECORD TO SUPABASE
// ==========================================

async function saveLandRecord(record) {

    const propertyKey = [
        record.state,
        record.district,
        record.village,
        record.tehsil,
        record.khataNumber,
        record.khasraNumber
    ]
        .map(value =>
            String(value || "")
                .trim()
                .toLowerCase()
        )
        .join("|");

    const { data, error } = await supabase
        .from("land_records")
        .insert([
            {
                recorded_holder: record.recordedHolder,
                father_name: record.fatherName,
                khata_number: record.khataNumber,
                khasra_number: record.khasraNumber,
                land_area: record.landArea,
                village: record.village,
                tehsil: record.tehsil,
                district: record.district,
                state: record.state,
                land_type: record.landType,
                record_status: record.recordStatus,
                mutation_info: record.mutationInfo,
                answer: record.answer,
                property_key: propertyKey
            }
        ])
        .select();

    if (error) {
        console.error(
            "Supabase save error:",
            error.message
        );
        throw error;
    }

    console.log("Land record saved to Supabase!");

    return data;
}


// ==========================================
// AUDIT LOG
// ==========================================

async function createAuditLog({
    userId = null,
    action,
    entityType,
    entityId = null,
    details = {}
}) {
    try {

        const { error } = await supabase
            .from("audit_logs")
            .insert([
                {
                    user_id: userId,
                    action: action,
                    entity_type: entityType,
                    entity_id: entityId,
                    details: details
                }
            ]);

        if (error) {
            console.error(
                "Audit log error:",
                error.message
            );
            return false;
        }

        console.log(
            `🛡️ Audit: ${action} → ${entityType}`
        );

        return true;

    } catch (error) {

        console.error(
            "Audit log crash:",
            error.message
        );

        return false;
    }
}
    // ==========================================
// SAVE ORIGINAL DOCUMENT TO SUPABASE STORAGE
// ==========================================

async function saveDocumentFile(file) {

    if (!file) {
        throw new Error("No document file provided.");
    }

    const safeName =
        file.originalname
            .replace(/[^a-zA-Z0-9._-]/g, "_");

    const filePath =
        `${Date.now()}-${crypto.randomUUID()}-${safeName}`;

    const { data, error } =
        await supabase.storage
            .from("land-documents")
            .upload(
                filePath,
                file.buffer,
                {
                    contentType: file.mimetype,
                    upsert: false
                }
            );

    if (error) {
        console.error(
            "Document Storage error:",
            error.message
        );

        throw error;
    }

    console.log(
        "✅ Original document saved:",
        data.path
    );

    return {
        path: data.path,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size
    };
}

// ==========================================
// SAVE DOCUMENT METADATA
// ==========================================

async function saveLandDocumentMetadata({
    parcelId,
    file,
    storedDocument,
    uploadedBy
}) {

    const documentType =
        file.mimetype === "application/pdf"
            ? "pdf"
            : "image";

    const { data, error } = await supabase
        .from("land_documents")
        .insert([
            {
                parcel_id: parcelId,    
                uploaded_by: uploadedBy,
                document_type: documentType,
                title: file.originalname,
                storage_path: storedDocument.path
            }
        ])
        .select()
        .single();

    if (error) {
        console.error(
            "Land document metadata error:",
            error.message
        );

        throw error;
    }

    console.log(
        "✅ Document metadata saved!"
    );
await createAuditLog({
    userId: uploadedBy,
    action: "DOCUMENT_UPLOADED",
    entityType: "land_document",
    entityId: data.id,
    details: {
        title: file.originalname,
        parcelId: parcelId
    }
});
    return data;
}
// ==========================================
    // HEALTH CHECK
    // ==========================================

    app.get("/health", (req, res) => {

        res.json({
            
            success: true,
            message: "BhoomiLedger AI backend is working!"
        })

    })

    // ==========================================
    // NORMAL AI QUESTION
    // GEMINI PRIMARY -> GROQ BACKUP
    // ==========================================

    app.post("/ask", async (req, res) => {

        const question = req.body.question
        const state = req.body.state

        if (!question) {
            return res.status(400).json({
                error: "Question is required."
            })
        }

        const prompt = `
    You are BhoomiLedger AI, an assistant for understanding Indian land records.

    State:
    ${state || "Not specified"}

    User question:
    ${question}

    Answer clearly and briefly in simple language.

    Important:
    - Do not invent land-record information.
    - If information is missing, say so.
    - Explain confusing land-record terms when useful.
    - This is informational assistance, not legal verification.
    - Do NOT output <think>, <thinking>, or internal reasoning.
    `

        async function saveHistory(answer, provider) {

            try {

                const { error } = await supabase
                    .from("question_history")
                    .insert([
                        {
                            question: question,
                            answer: answer,
                            state: state || "Not specified",
                            provider: provider
                        }
                    ])

                if (error) {
                    console.error(
                        "History save error:",
                        error.message
                    )
                } else {
                    console.log(
                        "Question saved to history!"
                    )
                }

            } catch (error) {

                console.error(
                    "History save exception:",
                    error.message
                )

            }
        }

        // ======================================
        // GEMINI PRIMARY
        // ======================================

        try {

            const response =
                await gemini.models.generateContent({
                    model: "gemini-3.6-flash",
                    contents: prompt
                })

            const answer =
                cleanAIResponse(response.text)

            await saveHistory(
                answer,
                "Gemini"
            )

            return res.json({
                
                answer: answer,
                provider: "Gemini"
            })

        } catch (geminiError) {

            console.log(
                "Gemini failed:",
                geminiError.message
            )

        }

        // ======================================
        // GROQ BACKUP
        // ======================================

        try {

            const completion =
                await groq.chat.completions.create({

                    model: "openai/gpt-oss-20b",

                    messages: [
                        {
                            role: "system",
                            content:
                                "You are BhoomiLedger AI. Answer Indian land-record questions clearly and briefly. Never output <think> or internal reasoning."
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ]
                })

            const rawAnswer =
                completion.choices[0].message.content

            const answer =
                cleanAIResponse(rawAnswer)

            await saveHistory(
                answer,
                "Groq"
            )

            return res.json({
              
                answer: answer,
                provider: "Groq"
            })

        } catch (groqError) {

            console.log(
                "Groq failed:",
                groqError.message
            )

            return res.status(500).json({
                error:
                    "Both Gemini and Groq AI services are currently unavailable."
            })
        }
    })

    // ==========================================
    // DOCUMENT ANALYSIS
    // PDF + IMAGE
    // ==========================================
async function getAuthenticatedUser(req) {
    const authHeader =
        req.headers.authorization;

    if (
        !authHeader ||
        !authHeader.startsWith("Bearer ")
    ) {
        throw new Error(
            "Authentication required."
        );
    }

    const token =
        authHeader.substring(7);

    const {
        data,
        error
    } = await supabase.auth.getUser(token);

    if (error || !data.user) {
        console.error(
            "Authentication error:",
            error?.message
        );

        throw new Error(
            "Invalid or expired login session."
        );
    }

    return data.user;
}
    app.post(
        "/analyze-document",
        upload.single("document"),
        async (req, res) => {

            try {

                if (!req.file) {
                    return res.status(400).json({
                        error:
                            "Please upload a PDF or image."
                    })
                }
                const authenticatedUser =
    await getAuthenticatedUser(req);

console.log(
    "✅ Authenticated document uploader:",
    authenticatedUser.id
);
                const state =
                    req.body.state || "Not specified"

                const question =
                    req.body.question ||
                    "Analyze this land record and extract the important information."

                const mimeType =
                    req.file.mimetype
               const parcelId =
    req.body.parcel_id || null;
                const storedDocument =
    await saveDocumentFile(req.file);
                // ==================================
                // IMAGE ANALYSIS
                // ==================================

                if (
                    mimeType === "image/jpeg" ||
                    mimeType === "image/jpg" ||
                    mimeType === "image/png"
                ) {

                    const base64Image =
                        req.file.buffer.toString("base64")

                    const imagePrompt = `
    You are BhoomiLedger AI.

    Analyze this Indian land-record document carefully.

    State:
    ${state}

    User request:
    ${question}

    Extract the following fields:

    {
        "recordedHolder": "",
        "fatherName": "",
        "khataNumber": "",
        "khasraNumber": "",
        "landArea": "",
        "village": "",
        "tehsil": "",
        "district": "",
        "state": "",
        "landType": "",
        "recordStatus": "",
        "mutationInfo": "",
        "answer": ""
    }

    Rules:

    1. Read the document carefully.
    2. Preserve names and numbers exactly as visible.
    3. If multiple Khasra numbers exist, list them.
    4. For land area, prefer the total area if available.
    5. Do not guess missing information.
    6. Use "Not available" when a field cannot be read.
    7. Answer in simple language.
    8. Do NOT include <think>.
    9. Do NOT include <thinking>.
    10. Do NOT include internal reasoning.
    11. Return ONLY valid JSON.
    `

                    // ==================================
                    // GEMINI VISION PRIMARY
                    // ==================================

                    try {

                        console.log(
                            "Trying Gemini Vision..."
                        )

                        const response =
                            await gemini.models.generateContent({

                                model:
                                    "gemini-3.6-flash",

                                contents: [
                                    {
                                        text: imagePrompt
                                    },
                                    {
                                        inlineData: {
                                            mimeType: mimeType,
                                            data: base64Image
                                        }
                                    }
                                ]
                            })

                        const rawText =
                            cleanAIResponse(
                                response.text
                            )

                        let structuredData =
                            extractJSON(rawText)

                        if (structuredData) {

                            structuredData =
                                cleanStructuredData(
                                    structuredData
                                )

                            const savedRecord =
                                await saveLandRecord(
                                    structuredData
                                )
                               const savedDocument =
    await saveLandDocumentMetadata({
        parcelId,
        file: req.file,
        storedDocument,
        uploadedBy:
            authenticatedUser.id
    });

                            return res.json({

                                answer: 
                                    structuredData.answer ||
                                    "Document analyzed successfully.",

                                provider:
                                    "Gemini Vision",

                                record:
                                    structuredData,

                                saved:
                                    savedRecord,
                                  
                                     document:
        storedDocument

                            })
                        }

                        throw new Error(
                            "Gemini returned invalid JSON."
                        )

                    } catch (geminiVisionError) {

                        console.log(
                            "Gemini Vision failed:",
                            geminiVisionError.message
                        )

                    }

                    // ==================================
                    // GROQ VISION BACKUP
                    // ==================================

                    try {

                        console.log(
                            "Trying Groq Vision..."
                        )

                        const dataUrl =
                            `data:${mimeType};base64,${base64Image}`

                        const completion =
                            await groq.chat.completions.create({

                                model:
                                    "qwen/qwen3.6-27b",

                                messages: [
                                    {
                                        role: "system",
                                        content:
                                            "You are BhoomiLedger AI. Analyze Indian land records. Return ONLY valid JSON. Never output <think>, <thinking>, or internal reasoning."
                                    },
                                    {
                                        role: "user",
                                        content: [
                                            {
                                                type: "text",
                                                text: imagePrompt
                                            },
                                            {
                                                type: "image_url",
                                                image_url: {
                                                    url: dataUrl
                                                }
                                            }
                                        ]
                                    }
                                ]
                            })

                        const rawText =
                            completion
                                .choices[0]
                                .message
                                .content

                        const cleanedText =
                            cleanAIResponse(rawText)

                        let structuredData =
                            extractJSON(cleanedText)

                        if (!structuredData) {
                            throw new Error(
                                "Groq returned invalid JSON."
                            )
                        }

                        structuredData =
                            cleanStructuredData(
                                structuredData
                            )

                        const savedRecord =
                            await saveLandRecord(
                                structuredData
                            )
                        const savedDocument =
    await saveLandDocumentMetadata({
        parcelId,
        file: req.file,
        storedDocument,
        uploadedBy: authenticatedUser.id
    });
                        return res.json({

                            answer:
                                structuredData.answer ||
                                "Document analyzed successfully.",

                            provider:
                                "Groq Vision",

                            record:
                                structuredData,

                            saved:
                                savedRecord,

                            
document:
    storedDocument
                        })

                    } catch (groqVisionError) {

                        console.log(
                            "Groq Vision failed:",
                            groqVisionError.message
                        )

                        return res.status(500).json({

                            error:
                                "Both Gemini Vision and Groq Vision failed to analyze the image."

                        })
                    }
                }

                // ==================================
                // PDF ANALYSIS
                // ==================================

                if (mimeType === "application/pdf") {

                    console.log(
                        "Extracting PDF text..."
                    )

                    const parser =
                        new PDFParse({
                            data: req.file.buffer
                        })

                    const pdfData =
                        await parser.getText()

                    await parser.destroy()

                    const extractedText =
                        pdfData.text.trim()

                    // ==================================
                    // SCANNED PDF
                    // ==================================

                    if (!extractedText) {

                        return res.status(400).json({

                            error:
                                "This PDF appears to be scanned or image-based. Please upload the page as JPG or PNG for vision analysis."

                        })
                    }

                    const pdfPrompt = `
    You are BhoomiLedger AI.

    Analyze the following Indian land-record document.

    State:
    ${state}

    User request:
    ${question}

    Document text:
    ${extractedText}

    Extract the following information:

    {
        "recordedHolder": "",
        "fatherName": "",
        "khataNumber": "",
        "khasraNumber": "",
        "landArea": "",
        "village": "",
        "tehsil": "",
        "district": "",
        "state": "",
        "landType": "",
        "recordStatus": "",
        "mutationInfo": "",
        "answer": ""
    }

    Rules:

    - Preserve names and numbers exactly.
    - List multiple Khasra numbers if present.
    - Use total land area when available.
    - Do not guess.
    - Use "Not available" when information is missing.
    - Keep answer simple.
    - Do NOT output <think>.
    - Do NOT output <thinking>.
    - Do NOT output internal reasoning.
    - Return ONLY valid JSON.
    `

                    // ==================================
                    // GEMINI PDF PRIMARY
                    // ==================================

                    try {

                        console.log(
                            "Trying Gemini PDF analysis..."
                        )

                        const response =
                            await gemini.models.generateContent({

                                model:
                                    "gemini-3.6-flash",

                                contents:
                                    pdfPrompt
                            })

                        const rawText =
                            cleanAIResponse(
                                response.text
                            )

                        let structuredData =
                            extractJSON(rawText)

                        if (structuredData) {

                            structuredData =
                                cleanStructuredData(
                                    structuredData
                                )

                            const savedRecord =
                                await saveLandRecord(
                                    structuredData
                                )
                                const savedDocument =
    await saveLandDocumentMetadata({
        parcelId,
        file: req.file,
        storedDocument,
         uploadedBy:
            authenticatedUser.id
    });

                            return res.json({

                                answer:
                                    structuredData.answer ||
                                    "PDF analyzed successfully.",

                                provider:
                                    "Gemini",

                                record:
                                    structuredData,

                                saved:
                                    savedRecord,

document:
    storedDocument

                            })
                        }

                        throw new Error(
                            "Gemini returned invalid JSON."
                        )

                    } catch (geminiPdfError) {

                        console.log(
                            "Gemini PDF failed:",
                            geminiPdfError.message
                        )

                    }

                    // ==================================
                    // GROQ PDF BACKUP
                    // ==================================

                    try {

                        console.log(
                            "Trying Groq PDF analysis..."
                        )

                        const completion =
                            await groq.chat.completions.create({

                                model:
                                    "openai/gpt-oss-20b",

                                messages: [
                                    {
                                        role: "system",
                                        content:
                                            "You are BhoomiLedger AI. Analyze Indian land records and return ONLY valid JSON. Never output <think>, <thinking>, or internal reasoning."
                                    },
                                    {
                                        role: "user",
                                        content:
                                            pdfPrompt
                                    }
                                ]
                            })

                        const rawText =
                            completion
                                .choices[0]
                                .message
                                .content

                        const cleanedText =
                            cleanAIResponse(rawText)

                        let structuredData =
                            extractJSON(cleanedText)

                        if (!structuredData) {
                            throw new Error(
                                "Groq returned invalid JSON."
                            )
                        }

                        structuredData =
                            cleanStructuredData(
                                structuredData
                            )

                        const savedRecord =
                            await saveLandRecord(
                                structuredData
                            )
                        const savedDocument =
    await saveLandDocumentMetadata({
        parcelId,
        file: req.file,
        storedDocument,
         uploadedBy:
            authenticatedUser.id
    });
                        return res.json({

                            answer:
                                structuredData.answer ||
                                "PDF analyzed successfully.",

                            provider:
                                "Groq",

                            record:
                                structuredData,

                            saved:
                                savedRecord,

document:
    storedDocument

                        })

                    } catch (groqPdfError) {

                        console.log(
                            "Groq PDF failed:",
                            groqPdfError.message
                        )

                        return res.status(500).json({

                            error:
                                "Both Gemini and Groq failed to analyze the PDF."

                        })
                    }
                }

                // ==================================
                // UNSUPPORTED FILE
                // ==================================

                return res.status(400).json({

                    error:
                        "Unsupported file type. Please upload PDF, JPG, JPEG, or PNG."

                })

            } catch (error) {

                console.error(
                    "Document analysis error:",
                    error
                )

                return res.status(500).json({

                    error:
                        "Something went wrong while analyzing the document."

                })
            }
        }
    )

    // ==========================================
    // GET SAVED LAND RECORDS
    // ==========================================

    app.get("/records", async (req, res) => {

        try {

            const { data, error } =
                await supabase
                    .from("land_records")
                    .select("*")
                    .order("created_at", {
                        ascending: false
                    })

            if (error) {

                console.error(
                    "Supabase fetch error:",
                    error
                )

                return res.status(500).json({

                    success: false,
                    error: error.message

                })
            }

            res.json({

                success: true,
                records: data

            })

        } catch (error) {

            console.error(
                "Records error:",
                error
            )

            res.status(500).json({

                success: false,
                error:
                    "Failed to fetch records"

            })
        }
    })

    // ==========================================
    // GET QUESTION HISTORY
    // ==========================================

    app.get("/history", async (req, res) => {

        try {

            const { data, error } =
                await supabase
                    .from("question_history")
                    .select("*")
                    .order("created_at", {
                        ascending: false
                    })

            if (error) {

                console.error(
                    "History fetch error:",
                    error.message
                )

                return res.status(500).json({

                    success: false,
                    error: error.message

                })
            }

            res.json({

                success: true,
                history: data || []

            })

        } catch (error) {

            console.error(
                "History fetch exception:",
                error.message
            )

            res.status(500).json({

                success: false,
                error:
                    "Failed to fetch question history"

            })
        }
    })

    // ==========================================
    // DELETE ONE HISTORY ITEM
    // ==========================================

    app.delete("/history/:id", async (req, res) => {

        try {

            const { id } =
                req.params

            console.log(
                "Deleting history item:",
                id
            )

            const { data, error } =
                await supabase
                    .from("question_history")
                    .delete()
                    .eq("id", id)
                    .select()

            if (error) {

                console.error(
                    "History delete error:",
                    error.message
                )

                return res.status(500).json({

                    success: false,
                    error: error.message

                })
            }

            console.log(
                "History item deleted:",
                data
            )

            res.json({

                success: true,
                deleted: data

            })

        } catch (error) {

            console.error(
                "History delete exception:",
                error.message
            )

            res.status(500).json({

                success: false,
                error:
                    "Failed to delete history"

            })
        }
    })

    // ==========================================
    // DELETE ALL HISTORY
    // ==========================================

    app.delete("/history", async (req, res) => {

        try {

            console.log(
                "Deleting all question history..."
            )

            const { data, error } =
                await supabase
                    .from("question_history")
                    .delete()
                    .not("id", "is", null)
                    .select()

            if (error) {

                console.error(
                    "Clear history error:",
                    error.message
                )

                return res.status(500).json({

                    success: false,
                    error: error.message

                })
            }

            console.log(
                "All history deleted:",
                data
            )

            res.json({

                success: true,
                deleted: data

            })

        } catch (error) {

            console.error(
                "Clear history exception:",
                error.message
            )

            res.status(500).json({

                success: false,
                error:
                    "Failed to clear history"

            })
        }
    })

        // ==========================================
        // DASHBOARD STATISTICS
        // ==========================================

        app.get("/dashboard", async (req, res) => {

            try {

                const {
                    data: records,
                    error: recordsError
                } = await supabase
                    .from("land_records")
                    .select("*")

                if (recordsError) {
                    throw recordsError
                }

                const {
                    data: history,
                    error: historyError
                } = await supabase
                    .from("question_history")
                    .select("id")

                if (historyError) {
                    throw historyError
                }

                const allRecords =
                    records || []

                const allHistory =
                    history || []

             let issues = 0

allRecords.forEach(record => {

    const hasIssue =
        !record.recorded_holder ||
        !record.khata_number ||
        !record.khasra_number ||
        !record.land_area ||
        !record.village ||
        !record.district ||
        !record.state ||
        !record.mutation_info

    if (hasIssue) {
        issues++
    }

})

                res.json({

                    success: true,

                    records:
                        allRecords.length,

                    documents:
                        allRecords.length,

                    questions:
                        allHistory.length,

                    issues:
                        issues

                })

            } catch (error) {

                console.error(
                    "Dashboard error:",
                    error
                )

                res.status(500).json({

                    success: false,

                    error:
                        "Failed to load dashboard statistics."

                })
            }
        })

        // ==========================================
// TEST NEW SUPABASE DATABASE
// ==========================================

app.get("/db-test", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("land_parcels")
            .select("*");

        if (error) {
            console.error("Database test error:", error);

            return res.status(500).json({
                success: false,
                error: error.message
            });
        }

        res.json({
            success: true,
            message: "BhoomiLedger database connected!",
            parcels: data
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
    // ==========================================
    // SERVER START
    // ==========================================
const PORT =
    process.env.PORT || 3000;

// =====================================================
// 🗺️ LAND PARCELS GEOJSON API
// =====================================================
app.get("/api/parcels", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("land_parcels")
            .select("*");

        if (error) {
            console.error("Parcel API error:", error);

            return res.status(500).json({
                success: false,
                error: error.message
            });
        }

        const geojson = {
            type: "FeatureCollection",

            features: data.map(parcel => ({
                type: "Feature",

                geometry: parcel.boundary,

                properties: {
                    id: parcel.id,
                    plot_number: parcel.plot_number,
                    khasra_number: parcel.khasra_number,
                    village: parcel.village,
                    tehsil: parcel.tehsil,
                    district: parcel.district,
                    state: parcel.state,
                    area_sq_m: parcel.area_sq_m,
                    land_type: parcel.land_type,
                    verification_status: parcel.verification_status
                }
            }))
        };

        res.json(geojson);

    } catch (error) {
        console.error("Parcel API crash:", error);

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ==========================================
// GET DOCUMENTS FOR A PARCEL
// ==========================================
app.get("/api/parcels/:parcelId/documents", async (req, res) => {
    try {
        const { parcelId } = req.params;

        const { data, error } = await supabase
            .from("land_documents")
            .select("*")
            .eq("parcel_id", parcelId)
            .order("created_at", {
                ascending: false
            });

        if (error) {
            throw error;
        }

        res.json({
            success: true,
            documents: data
        });

    } catch (error) {
        console.error(
            "Document list error:",
            error.message
        );

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
// ==========================================
// VIEW PRIVATE DOCUMENT
// ==========================================
app.get("/api/documents/:id/view", async (req, res) => {
    try {
        const { id } = req.params;

        const { data: document, error } =
            await supabase
                .from("land_documents")
                .select("*")
                .eq("id", id)
                .single();

        if (error || !document) {
            return res.status(404).json({
                error: "Document not found."
            });
        }

        const {
            data: signedData,
            error: signedError
        } = await supabase.storage
            .from("land-documents")
            .createSignedUrl(
                document.storage_path,
                300
            );

        if (signedError) {
            throw signedError;
        }

        res.json({
            success: true,
            url: signedData.signedUrl
        });

    } catch (error) {
        console.error(
            "Document view error:",
            error.message
        );

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
// ==========================================
// VERIFY / REJECT DOCUMENT
// ==========================================
app.patch("/api/documents/:id/status", async (req, res) => {
    try {
        const authenticatedUser =
            await getAuthenticatedUser(req);

        const { id } = req.params;
        const { status } = req.body;

        if (
            status !== "verified" &&
            status !== "rejected"
        ) {
            return res.status(400).json({
                error:
                    "Status must be verified or rejected."
            });
        }

        const { data: profile, error: profileError } =
            await supabase
                .from("profiles")
                .select("role")
                .eq("id", authenticatedUser.id)
                .single();

        if (
            profileError ||
            !profile ||
            !["official", "admin"].includes(
                profile.role
            )
        ) {
            return res.status(403).json({
                error:
                    "Only officials or admins can verify documents."
            });
        }

        const { data, error } =
            await supabase
                .from("land_documents")
                .update({
                    verification_status: status,
                    verified_by:
                        authenticatedUser.id,
                    verified_at:
                        new Date().toISOString()
                })
                .eq("id", id)
                .select()
                .single();

        if (error) {
            throw error;
        }
await createAuditLog({
    userId: authenticatedUser.id,
    action:
        status === "verified"
            ? "DOCUMENT_VERIFIED"
            : "DOCUMENT_REJECTED",
    entityType: "land_document",
    entityId: id,
    details: {
        status: status
    }
}); 
        res.json({
            success: true,
            document: data
        });

    } catch (error) {
        console.error(
            "Document verification error:",
            error.message
        );

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
app.get("/api/document-history", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("land_documents")
           .select("*")
            .order("created_at", {
                ascending: false
            });
        
        if (error) {
            throw error;
        }

        res.json({
            success: true,
            documents: data
        });

    } catch (error) {
        console.error(
            "Document history error:",
            error.message
        );

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
app.get("/api/parcels/:parcelId/ownership", async (req, res) => {
    try {
        const { parcelId } = req.params;

        const { data, error } = await supabase
            .from("ownership_records")
            .select(`
                *,
                owner:profiles(
                    id,
                    full_name
                )
            `)
            .eq("parcel_id", parcelId)
            .order("created_at", {
                ascending: false
            });

        if (error) {
            throw error;
        }

        res.json({
            success: true,
            ownership: data
        });

    } catch (error) {

        console.error(
            "Ownership fetch error:",
            error.message
        );

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
    app.listen(PORT, () => {

        console.log(
            `BhoomiLedger AI running on http://localhost:${PORT}`
        )

    })