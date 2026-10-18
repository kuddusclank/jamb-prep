export interface ResultCardImageOptions {
  type: 'practice' | 'mock';
  subjectName?: string;
  topicTitle?: string;
  score?: number;
  totalQuestions?: number;
  percentage?: number;
  feedbackText?: string;
  referralCode?: string | null;
  referralUrl: string;
  totalScore?: number;
  timeSpentMinutes?: number;
  subjects?: { name: string; score: number }[];
}

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(' ');
  let line = '';
  const lines: string[] = [];

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      lines.push(line.trim());
      line = words[n] + ' ';
    } else {
      line = testLine;
    }
  }
  lines.push(line.trim());

  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((l, i) => {
    ctx.fillText(l, x, startY + i * lineHeight);
  });
}

export async function generateResultCardImage(options: ResultCardImageOptions): Promise<Blob> {
  const width = 960;
  const height = 960;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  // 1. Soft neutral canvas background
  ctx.fillStyle = '#F4F7F4';
  ctx.fillRect(0, 0, width, height);

  // 2. Central white card with border & subtle shadow
  ctx.save();
  ctx.shadowColor = 'rgba(9, 46, 40, 0.08)';
  ctx.shadowBlur = 32;
  ctx.shadowOffsetY = 12;

  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  drawRoundRect(ctx, 48, 48, width - 96, height - 96, 32);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  drawRoundRect(ctx, 48, 48, width - 96, height - 96, 32);
  ctx.stroke();

  // 3. Medal / Award Badge Icon
  const badgeCenterX = width / 2;
  const badgeCenterY = 125;
  ctx.fillStyle = '#ECFDF5';
  ctx.strokeStyle = '#A7F3D0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  drawRoundRect(ctx, badgeCenterX - 34, badgeCenterY - 34, 68, 68, 18);
  ctx.fill();
  ctx.stroke();

  // Draw medal icon glyph
  ctx.strokeStyle = '#116149';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(badgeCenterX, badgeCenterY - 6, 14, 0, Math.PI * 2);
  ctx.stroke();

  // Ribbon tails
  ctx.beginPath();
  ctx.moveTo(badgeCenterX - 8, badgeCenterY + 6);
  ctx.lineTo(badgeCenterX - 12, badgeCenterY + 22);
  ctx.lineTo(badgeCenterX - 6, badgeCenterY + 18);
  ctx.lineTo(badgeCenterX, badgeCenterY + 22);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(badgeCenterX + 8, badgeCenterY + 6);
  ctx.lineTo(badgeCenterX + 12, badgeCenterY + 22);
  ctx.lineTo(badgeCenterX + 6, badgeCenterY + 18);
  ctx.lineTo(badgeCenterX, badgeCenterY + 22);
  ctx.stroke();

  // 4. Badge Subtitle (e.g. PRACTICE COMPLETE / MOCK EXAM COMPLETE)
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#116149';
  ctx.font = '700 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const badgeLabel = options.type === 'mock' ? 'MOCK EXAM COMPLETE' : 'PRACTICE COMPLETE';
  ctx.fillText(badgeLabel, badgeCenterX, 195);

  // 5. Title & Subtitle
  ctx.fillStyle = '#092E28';
  ctx.font = '700 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, serif';
  if (options.type === 'mock') {
    ctx.fillText('UTME Mock Exam Summary', badgeCenterX, 240);
  } else {
    // Practice Session Summary
    ctx.fillText('Practice Session Summary', badgeCenterX, 240);
  }

  ctx.fillStyle = '#475569';
  ctx.font = '500 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  let subtitle = '';
  if (options.type === 'mock') {
    subtitle = `${options.timeSpentMinutes ?? 0} minutes of practice across ${options.subjects?.length ?? 4} subjects`;
  } else {
    const count = options.totalQuestions ?? 0;
    const subj = options.subjectName || 'Practice Mode';
    subtitle = `You completed ${count} questions in ${subj}.`;
  }
  ctx.fillText(subtitle, badgeCenterX, 285);

  // 6. Score & Accuracy Card Box (the exact card portion)
  const boxX = 100;
  const boxY = 325;
  const boxW = width - 200;
  const boxH = 180;
  ctx.fillStyle = '#F6F8F5';
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  drawRoundRect(ctx, boxX, boxY, boxW, boxH, 24);
  ctx.fill();
  ctx.stroke();

  if (options.type === 'mock') {
    // Total Score
    const total = options.totalScore ?? 0;
    ctx.fillStyle = '#092E28';
    ctx.font = '700 46px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`${total} / 400`, boxX + boxW * 0.28, boxY + 70);

    ctx.fillStyle = '#64748B';
    ctx.font = '600 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Total Score', boxX + boxW * 0.28, boxY + 120);

    // Divider
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(boxX + boxW * 0.55, boxY + 35);
    ctx.lineTo(boxX + boxW * 0.55, boxY + 145);
    ctx.stroke();

    // Time spent
    ctx.fillStyle = '#116149';
    ctx.font = '700 46px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`${options.timeSpentMinutes ?? 0}m`, boxX + boxW * 0.78, boxY + 70);

    ctx.fillStyle = '#64748B';
    ctx.font = '600 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Time Spent', boxX + boxW * 0.78, boxY + 120);
  } else {
    // Left: Correct Answers
    const scoreVal = options.score ?? 0;
    const totalVal = options.totalQuestions ?? 0;
    ctx.fillStyle = '#092E28';
    ctx.font = '700 46px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`${scoreVal} / ${totalVal}`, boxX + boxW * 0.28, boxY + 70);

    ctx.fillStyle = '#64748B';
    ctx.font = '600 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Correct Answers', boxX + boxW * 0.28, boxY + 120);

    // Divider
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(boxX + boxW * 0.5, boxY + 35);
    ctx.lineTo(boxX + boxW * 0.5, boxY + 145);
    ctx.stroke();

    // Right: Accuracy
    const pct = options.percentage ?? (totalVal > 0 ? Math.round((scoreVal / totalVal) * 100) : 0);
    ctx.fillStyle = pct >= 70 ? '#116149' : '#D97706';
    ctx.font = '700 46px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`${pct}%`, boxX + boxW * 0.72, boxY + 70);

    ctx.fillStyle = '#64748B';
    ctx.font = '600 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Accuracy', boxX + boxW * 0.72, boxY + 120);
  }

  // 7. Feedback paragraph
  const feedback = options.feedbackText || (
    options.type === 'mock'
      ? 'Consistent mock simulations build exam temperament and high UTME scores.'
      : (options.percentage ?? 0) >= 75
        ? 'Excellent performance! Keep reinforcing your mastery with consistent daily revision.'
        : 'Good effort. Review the diagnostic explanations carefully to turn mistakes into points.'
  );

  ctx.fillStyle = '#475569';
  ctx.font = '500 17px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  wrapText(ctx, feedback, badgeCenterX, 550, boxW - 40, 26);

  // 8. Referral & Brand Callout Box
  const refBoxY = 635;
  const refBoxH = 175;
  ctx.fillStyle = '#092E28';
  ctx.beginPath();
  drawRoundRect(ctx, boxX, refBoxY, boxW, refBoxH, 24);
  ctx.fill();

  // Top header in brand box
  ctx.textAlign = 'left';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('JAMBPrep', boxX + 32, refBoxY + 40);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '500 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('by LecternIQ', boxX + 155, refBoxY + 40);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#A7F3D0';
  ctx.font = '600 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('8,400+ Official Past Questions', boxX + boxW - 32, refBoxY + 40);

  // Divider inside brand box
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(boxX + 32, refBoxY + 68);
  ctx.lineTo(boxX + boxW - 32, refBoxY + 68);
  ctx.stroke();

  // Referral Invite Copy
  ctx.textAlign = 'left';
  ctx.fillStyle = '#E2E8F0';
  ctx.font = '500 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Study with me on JAMBPrep • Get 50% discount on Premium:', boxX + 32, refBoxY + 100);

  // Referral URL / Code
  ctx.fillStyle = '#E7B85A';
  ctx.font = '700 17px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
  ctx.fillText(options.referralUrl, boxX + 32, refBoxY + 135);

  if (options.referralCode) {
    ctx.textAlign = 'right';
    ctx.fillStyle = '#E7B85A';
    ctx.font = '700 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`Code: ${options.referralCode}`, boxX + boxW - 32, refBoxY + 135);
  }

  // 9. Bottom watermark
  ctx.textAlign = 'center';
  ctx.fillStyle = '#94A3B8';
  ctx.font = '500 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Official UTME CBT Practice & Mock Simulator • jambprep.lecterniq.com', badgeCenterX, 855);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to generate image blob from canvas'));
    }, 'image/png');
  });
}
