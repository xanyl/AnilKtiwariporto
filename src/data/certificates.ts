import codePathCertificate from "../../certificates/c8a54026-757f-4b18-bf0c-573033f115b7.pdf?url";
import pythonForDataScienceCertificate from "../../certificates/Coursera MV9KT6C99L6S.pdf?url";
import pythonCapstoneCertificate from "../../certificates/Coursera MARZHTUTPSWZ.pdf?url";
import webDataCertificate from "../../certificates/Coursera J9388Q68FUM6.pdf?url";
import pythonDataStructuresCertificate from "../../certificates/Coursera 3KZV65YFH466.pdf?url";
import programmingForEverybodyCertificate from "../../certificates/Coursera PFA6Q4P9R9YZ.pdf?url";

export interface CertificateRecord {
  title: string;
  issuer: string;
  issued: string;
  file: string;
  credentialId: string;
  verificationUrl?: string;
}

export const certificates: CertificateRecord[] = [
  {
    title: "AI Open Source Capstone Course",
    issuer: "CodePath - Honors",
    issued: "Summer 2026",
    file: codePathCertificate,
    credentialId: "421004",
  },
  {
    title: "Python for Data Science, AI & Development",
    issuer: "IBM via Coursera",
    issued: "October 5, 2023",
    file: pythonForDataScienceCertificate,
    credentialId: "MV9KT6C99L6S",
    verificationUrl: "https://coursera.org/verify/MV9KT6C99L6S",
  },
  {
    title: "Capstone: Retrieving, Processing, and Visualizing Data with Python",
    issuer: "University of Michigan via Coursera",
    issued: "June 15, 2021",
    file: pythonCapstoneCertificate,
    credentialId: "MARZHTUTPSWZ",
    verificationUrl: "https://coursera.org/verify/MARZHTUTPSWZ",
  },
  {
    title: "Using Python to Access Web Data",
    issuer: "University of Michigan via Coursera",
    issued: "October 28, 2020",
    file: webDataCertificate,
    credentialId: "J9388Q68FUM6",
    verificationUrl: "https://coursera.org/verify/J9388Q68FUM6",
  },
  {
    title: "Python Data Structures",
    issuer: "University of Michigan via Coursera",
    issued: "September 3, 2020",
    file: pythonDataStructuresCertificate,
    credentialId: "3KZV65YFH466",
    verificationUrl: "https://coursera.org/verify/3KZV65YFH466",
  },
  {
    title: "Programming for Everybody (Getting Started with Python)",
    issuer: "University of Michigan via Coursera",
    issued: "July 21, 2020",
    file: programmingForEverybodyCertificate,
    credentialId: "PFA6Q4P9R9YZ",
    verificationUrl: "https://coursera.org/verify/PFA6Q4P9R9YZ",
  },
];
