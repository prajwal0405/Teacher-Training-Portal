import React, { useRef, useState } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function CertificateTemplate({
  teacherName,
  courseTitle,
  issuedDate,
  credentialId,
  grade,
  score,
  onClose
}) {
  const certRef = useRef(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownloadPdf = async () => {
    if (!certRef.current) return;
    setDownloading(true);
    try {
      const element = certRef.current;
      const canvas = await html2canvas(element, { 
        scale: 2,
        useCORS: true,
        logging: false,
        onclone: (doc) => {
          const el = doc.querySelector('.cert-container');
          if (el) {
            el.style.transform = 'none';
            el.style.boxShadow = 'none';
          }
        }
      });
      const imgData = canvas.toDataURL("image/png");
      
      const pdf = new jsPDF("landscape", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Certificate_${teacherName?.replace(/\s+/g, '_') || "Download"}.pdf`);
    } catch (err) {
      console.error("Error generating PDF:", err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .cert-container, .cert-container * {
            visibility: visible;
          }
          .cert-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            transform: none !important;
            box-shadow: none !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
      <div style={styles.actionContainer} className="no-print">
        <button onClick={handleDownloadPdf} style={styles.printBtn} disabled={downloading}>
          {downloading ? "⏳ Generating PDF..." : "📥 Download as PDF"}
        </button>
        <button onClick={() => window.print()} style={{ ...styles.printBtn, background: "#3b82f6" }}>
          🖨️ Print Certificate
        </button>
        <button onClick={onClose} style={styles.closeBtn}>
          ✖ Close
        </button>
      </div>

      <div style={styles.certWrapper} className="cert-container" ref={certRef}>
        <div style={styles.certBorder}>
          <div style={styles.certInnerBorder}>
            <div style={styles.header}>
              <div style={styles.logo}>🚀 SpacECE</div>
              <div style={styles.credential}>ID: {credentialId}</div>
            </div>

            <div style={styles.titleSection}>
              <h1 style={styles.title}>CERTIFICATE</h1>
              <h2 style={styles.subtitle}>OF COMPLETION</h2>
            </div>

            <div style={styles.bodySection}>
              <p style={styles.text}>This is to proudly certify that</p>
              <h3 style={styles.teacherName}>{teacherName || "Teacher Name"}</h3>
              <p style={styles.text}>has successfully completed the course</p>
              <h4 style={styles.courseTitle}>{courseTitle || "Course Title"}</h4>
            </div>

            <div style={styles.statsSection}>
              {(grade || (score !== null && score !== undefined)) && (
                <div style={styles.statBox}>
                  <span style={styles.statLabel}>Performance</span>
                  <span style={styles.statValue}>
                    {grade ? `Grade: ${grade}` : `Score: ${score}/100`}
                  </span>
                </div>
              )}
            </div>

            <div style={styles.footer}>
              <div style={styles.signatureBlock}>
                <div style={styles.dateVal}>
                  {issuedDate ? new Date(issuedDate).toLocaleDateString("en-IN", { day: 'numeric', month: 'long', year: 'numeric' }) : "Date Pending"}
                </div>
                <div style={styles.signatureLine}>Date of Issue</div>
              </div>

              <div style={styles.badge}>
                <div style={styles.badgeInner}>
                  ★<br />SE<br />★
                </div>
              </div>

              <div style={styles.signatureBlock}>
                <div style={styles.signatureText}>SpacECE Admin</div>
                <div style={styles.signatureLine}>Authorized Signature</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @media print {
          @page { size: landscape; margin: 0; }
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .no-print { display: none !important; }
          .cert-container { 
            width: 100vw !important; 
            height: 100vh !important; 
            margin: 0 !important; 
            box-shadow: none !important; 
            border-radius: 0 !important; 
            transform: scale(1) !important;
          }
        }
      `}</style>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(0,0,0,0.85)",
    zIndex: 99999,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    overflowY: "auto",
  },
  actionContainer: {
    display: "flex",
    gap: "16px",
    marginBottom: "20px",
    position: "sticky",
    top: "20px",
    zIndex: 10,
    background: "rgba(255, 255, 255, 0.9)",
    padding: "10px 20px",
    borderRadius: "12px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  },
  printBtn: {
    background: "#10b981",
    color: "white",
    border: "none",
    padding: "12px 24px",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
    boxShadow: "0 4px 6px rgba(16, 185, 129, 0.3)",
    transition: "transform 0.2s",
  },
  closeBtn: {
    background: "#ef4444",
    color: "white",
    border: "none",
    padding: "12px 24px",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
    boxShadow: "0 4px 6px rgba(239, 68, 68, 0.3)",
    transition: "transform 0.2s",
  },
  certWrapper: {
    width: "1056px",
    height: "816px",
    background: "white",
    borderRadius: "16px",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
    padding: "24px",
    boxSizing: "border-box",
    transform: "scale(min(1, max(0.4, calc(80vw / 1056))))",
    transformOrigin: "top center",
  },
  certBorder: {
    width: "100%",
    height: "100%",
    border: "12px solid #0f172a",
    padding: "12px",
    boxSizing: "border-box",
    position: "relative",
  },
  certInnerBorder: {
    width: "100%",
    height: "100%",
    border: "4px solid #f59e0b",
    padding: "48px",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    position: "relative",
    background: "radial-gradient(circle at center, #ffffff 40%, #fdf8f6 100%)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "40px",
  },
  logo: {
    fontSize: "32px",
    fontWeight: "900",
    color: "#2563eb",
    letterSpacing: "2px",
  },
  credential: {
    fontSize: "14px",
    color: "#64748b",
    fontFamily: "monospace",
  },
  titleSection: {
    textAlign: "center",
    marginBottom: "48px",
  },
  title: {
    fontSize: "64px",
    fontWeight: "900",
    color: "#0f172a",
    margin: 0,
    letterSpacing: "12px",
    fontFamily: "Georgia, serif",
  },
  subtitle: {
    fontSize: "24px",
    color: "#f59e0b",
    letterSpacing: "8px",
    margin: "8px 0 0 0",
    textTransform: "uppercase",
  },
  bodySection: {
    textAlign: "center",
    flex: 1,
  },
  text: {
    fontSize: "20px",
    color: "#475569",
    fontStyle: "italic",
    margin: "24px 0",
  },
  teacherName: {
    fontSize: "48px",
    fontWeight: "bold",
    color: "#1e293b",
    margin: "0",
    textTransform: "capitalize",
    fontFamily: "'Great Vibes', cursive, Georgia, serif",
    borderBottom: "2px solid #cbd5e1",
    display: "inline-block",
    padding: "0 40px 10px 40px",
  },
  courseTitle: {
    fontSize: "32px",
    fontWeight: "bold",
    color: "#0f172a",
    margin: "0",
    maxWidth: "800px",
    marginLeft: "auto",
    marginRight: "auto",
    lineHeight: "1.4",
  },
  statsSection: {
    textAlign: "center",
    marginBottom: "40px",
  },
  statBox: {
    display: "inline-flex",
    flexDirection: "column",
    alignItems: "center",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    padding: "12px 32px",
    borderRadius: "12px",
  },
  statLabel: {
    fontSize: "12px",
    color: "#64748b",
    textTransform: "uppercase",
    fontWeight: "bold",
    letterSpacing: "1px",
    marginBottom: "4px",
  },
  statValue: {
    fontSize: "20px",
    fontWeight: "bold",
    color: "#10b981",
  },
  footer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: "auto",
  },
  signatureBlock: {
    textAlign: "center",
    width: "250px",
  },
  dateVal: {
    fontSize: "20px",
    fontWeight: "bold",
    color: "#334155",
    marginBottom: "12px",
    height: "30px",
  },
  signatureText: {
    fontSize: "28px",
    fontFamily: "'Brush Script MT', cursive, Georgia, serif",
    color: "#334155",
    marginBottom: "4px",
    height: "38px",
  },
  signatureLine: {
    borderTop: "2px solid #94a3b8",
    paddingTop: "8px",
    fontSize: "14px",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "1px",
  },
  badge: {
    width: "100px",
    height: "100px",
    background: "#f59e0b",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 10px 15px -3px rgba(245, 158, 11, 0.4)",
    border: "4px solid #fff",
    outline: "2px solid #f59e0b",
  },
  badgeInner: {
    textAlign: "center",
    color: "white",
    fontWeight: "bold",
    fontSize: "20px",
    lineHeight: "1",
  }
};
