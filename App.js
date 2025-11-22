import React, { useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import "./App.css";


function App() {
  const [company, setCompany] = useState("");
  const [wiki, setWiki] = useState("");
  const [plan, setPlan] = useState("");
  const [editable, setEditable] = useState("");
  const [loading, setLoading] = useState(false);


  async function handleGenerate(e) {
    e?.preventDefault();
    if (!company) return alert("Enter a company name!");
    setLoading(true);
    setWiki("");
    setPlan("");
    try {
      const resp = await axios.post("http://localhost:4000/api/company", { name: company });
      setWiki(resp.data.wiki || "No wiki info");
      setPlan(resp.data.plan || "");
      setEditable(resp.data.plan || "");
    } catch (err) {
      alert("Error: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  }


  function savePDF() {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(`Account Plan for ${company}`, 10, 10);
    doc.setFontSize(11);
    const lines = doc.splitTextToSize(editable, 180);
    doc.text(lines, 10, 20);
    doc.save(`${company}_account_plan.pdf`);
  }


  return (
    <div className="container">
      <h1>COMPANY RESEARCH ASSISTANT</h1>
      <form onSubmit={handleGenerate}>
        <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Enter company name (e.g., Tesla)" />
        <button type="submit" disabled={loading}>{loading ? "Searching..." : "Generate Plan"}</button>
      </form>


      {wiki && (
        <div className="card">
          <h3>Source (Wikipedia)</h3>
          <p>{wiki}</p>
        </div>
      )}


      {plan && (
        <div className="card">
          <h3>Generated Plan</h3>
          <textarea value={editable} onChange={(e) => setEditable(e.target.value)} rows={12} />
          <div style={{ marginTop: 8 }}>
            <button onClick={() => setEditable(plan)}>Reset to AI version</button>
            <button onClick={savePDF} style={{ marginLeft: 8 }}>Export PDF</button>
          </div>
        </div>
      )}
    </div>
  );
}


export default App;