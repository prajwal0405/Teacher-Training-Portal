const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, PageBreak,
  AlignmentType, BorderStyle,
} = require("docx");
const { courses } = require("./courseData");

const children = [];

children.push(
  new Paragraph({
    text: "SpacECE Pre-Primary Teacher Development Course Library",
    heading: HeadingLevel.TITLE,
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 },
    children: [
      new TextRun({
        text: "10 Comprehensive Courses on Pre-Primary Teaching Strategies & Child Development",
        italics: true,
        color: "555555",
      }),
    ],
  }),
  new Paragraph({ children: [new PageBreak()] })
);

// Table of contents (simple manual listing since headings are used for structure)
children.push(
  new Paragraph({ text: "Course List", heading: HeadingLevel.HEADING_1, spacing: { after: 200 } })
);
courses.forEach((c, i) => {
  children.push(
    new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({ text: `${i + 1}. `, bold: true }),
        new TextRun({ text: `${c.title}  ` }),
        new TextRun({ text: `(${c.category} · ${c.level} · ${c.duration})`, italics: true, color: "777777" }),
      ],
    })
  );
});
children.push(new Paragraph({ children: [new PageBreak()] }));

courses.forEach((course, ci) => {
  // Course title = Heading1 (parsed as course boundary)
  children.push(
    new Paragraph({ text: course.title, heading: HeadingLevel.HEADING_1, spacing: { after: 120 } })
  );
  children.push(
    new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({ text: "Category: ", bold: true }),
        new TextRun({ text: `${course.category}    ` }),
        new TextRun({ text: "Level: ", bold: true }),
        new TextRun({ text: `${course.level}    ` }),
        new TextRun({ text: "Duration: ", bold: true }),
        new TextRun({ text: course.duration }),
      ],
    })
  );
  children.push(
    new Paragraph({
      spacing: { after: 80 },
      children: [new TextRun({ text: "Description: ", bold: true }), new TextRun({ text: course.description })],
    })
  );
  children.push(
    new Paragraph({
      spacing: { after: 200 },
      children: [new TextRun({ text: "Learning Objectives: ", bold: true }), new TextRun({ text: course.objectives })],
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC", space: 8 } },
    })
  );

  course.topics.forEach((topic, ti) => {
    // Topic title = Heading2 (parsed as topic boundary within a course)
    children.push(
      new Paragraph({
        text: `${ci + 1}.${ti + 1} ${topic.title}`,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 160, after: 100 },
      })
    );
    children.push(
      new Paragraph({
        spacing: { after: 200 },
        alignment: AlignmentType.JUSTIFIED,
        children: [new TextRun({ text: topic.notes })],
      })
    );
  });

  if (ci < courses.length - 1) {
    children.push(new Paragraph({ children: [new PageBreak()] }));
  }
});

const doc = new Document({
  sections: [
    {
      properties: {
        page: { size: { width: 12240, height: 15840 } }, // US Letter
      },
      children,
    },
  ],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync("/home/claude/build/PreSchool_Teacher_Courses.docx", buf);
  console.log("docx written");
});
