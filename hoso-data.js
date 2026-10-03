// Ngân Hà Của Con — dữ liệu hồ sơ bé: âm lịch Việt Nam (thuật toán Hồ Ngọc Đức, múi giờ +7), can chi, nạp âm,
// cung hoàng đạo, đá & hoa tháng sinh, tính cách (nội dung tự viết, mang tính tham khảo cho vui). Không gọi mạng.

const INT = Math.floor, TZ = 7;
export function jdFromDate(dd, mm, yy) {
  const a = INT((14 - mm) / 12), y = yy + 4800 - a, m = mm + 12 * a - 3;
  let jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - INT(y / 100) + INT(y / 400) - 32045;
  if (jd < 2299161) jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - 32083;
  return jd;
}
function newMoon(k) {
  const T = k / 1236.85, T2 = T * T, T3 = T2 * T, dr = Math.PI / 180;
  let Jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
  Jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
  const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
  const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
  const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
  let C1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M);
  C1 = C1 - 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(dr * 2 * Mpr) - 0.0004 * Math.sin(dr * 3 * Mpr);
  C1 = C1 + 0.0104 * Math.sin(dr * 2 * F) - 0.0051 * Math.sin(dr * (M + Mpr)) - 0.0074 * Math.sin(dr * (M - Mpr)) + 0.0004 * Math.sin(dr * (2 * F + M));
  C1 = C1 - 0.0004 * Math.sin(dr * (2 * F - M)) - 0.0006 * Math.sin(dr * (2 * F + Mpr)) + 0.0010 * Math.sin(dr * (2 * F - Mpr)) + 0.0005 * Math.sin(dr * (2 * Mpr + M));
  const deltat = T < -11 ? 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3 : -0.000278 + 0.000265 * T + 0.000262 * T2;
  return INT(Jd1 + C1 - deltat + 0.5 + TZ / 24);
}
function sunLong(jdn) {
  const T = (jdn - 2451545.5 - TZ / 24) / 36525, T2 = T * T, dr = Math.PI / 180;
  const M = 357.52910 + 35999.05030 * T - 0.0001559 * T2 - 0.00000048 * T * T2, L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
  let DL = (1.914600 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
  DL += (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) + 0.000290 * Math.sin(dr * 3 * M);
  let L = (L0 + DL) * dr; L -= Math.PI * 2 * INT(L / (Math.PI * 2));
  return INT(L / Math.PI * 6);
}
function month11(yy) { const off = jdFromDate(31, 12, yy) - 2415021, k = INT(off / 29.530588853); let nm = newMoon(k); if (sunLong(nm) >= 9) nm = newMoon(k - 1); return nm; }
function leapOffset(a11) {
  const k = INT((a11 - 2415021.076998695) / 29.530588853 + 0.5); let last, i = 1, arc = sunLong(newMoon(k + i));
  do { last = arc; i++; arc = sunLong(newMoon(k + i)); } while (arc !== last && i < 14);
  return i - 1;
}
// dương → âm: { d, m, y, leap }
export function solar2lunar(dd, mm, yy) {
  const dn = jdFromDate(dd, mm, yy), k = INT((dn - 2415021.076998695) / 29.530588853);
  let ms = newMoon(k + 1); if (ms > dn) ms = newMoon(k);
  let a11 = month11(yy), b11 = a11, ly;
  if (a11 >= ms) { ly = yy; a11 = month11(yy - 1); } else { ly = yy + 1; b11 = month11(yy + 1); }
  const ld = dn - ms + 1, diff = INT((ms - a11) / 29); let leap = 0, lm = diff + 11;
  if (b11 - a11 > 365) { const lo = leapOffset(a11); if (diff >= lo) { lm = diff + 10; if (diff === lo) leap = 1; } }
  if (lm > 12) lm -= 12; if (lm >= 11 && diff < 4) ly -= 1;
  return { d: ld, m: lm, y: ly, leap: !!leap };
}

export const CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
export const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
export const CON = ['Chuột', 'Trâu', 'Hổ', 'Mèo', 'Rồng', 'Rắn', 'Ngựa', 'Dê', 'Khỉ', 'Gà', 'Chó', 'Lợn'];
export const canChi = y => `${CAN[(y + 6) % 10]} ${CHI[(y + 8) % 12]}`;
// nạp âm theo cặp trong 60 hoa giáp (bắt đầu Giáp Tý)
const NAP = [['Hải Trung Kim', 'Vàng trong biển', 'Kim'], ['Lư Trung Hỏa', 'Lửa trong lò', 'Hỏa'], ['Đại Lâm Mộc', 'Gỗ rừng già', 'Mộc'], ['Lộ Bàng Thổ', 'Đất ven đường', 'Thổ'], ['Kiếm Phong Kim', 'Vàng mũi kiếm', 'Kim'], ['Sơn Đầu Hỏa', 'Lửa trên núi', 'Hỏa'],
  ['Giản Hạ Thủy', 'Nước dưới khe', 'Thủy'], ['Thành Đầu Thổ', 'Đất trên thành', 'Thổ'], ['Bạch Lạp Kim', 'Vàng chân đèn', 'Kim'], ['Dương Liễu Mộc', 'Gỗ cây dương liễu', 'Mộc'], ['Tuyền Trung Thủy', 'Nước trong suối', 'Thủy'], ['Ốc Thượng Thổ', 'Đất trên mái nhà', 'Thổ'],
  ['Tích Lịch Hỏa', 'Lửa sấm sét', 'Hỏa'], ['Tùng Bách Mộc', 'Gỗ tùng bách', 'Mộc'], ['Trường Lưu Thủy', 'Nước chảy dài', 'Thủy'], ['Sa Trung Kim', 'Vàng trong cát', 'Kim'], ['Sơn Hạ Hỏa', 'Lửa dưới núi', 'Hỏa'], ['Bình Địa Mộc', 'Gỗ đồng bằng', 'Mộc'],
  ['Bích Thượng Thổ', 'Đất trên vách', 'Thổ'], ['Kim Bạch Kim', 'Vàng pha bạc', 'Kim'], ['Phú Đăng Hỏa', 'Lửa đèn to', 'Hỏa'], ['Thiên Hà Thủy', 'Nước trên trời', 'Thủy'], ['Đại Trạch Thổ', 'Đất nền nhà lớn', 'Thổ'], ['Thoa Xuyến Kim', 'Vàng trang sức', 'Kim'],
  ['Tang Đố Mộc', 'Gỗ cây dâu', 'Mộc'], ['Đại Khê Thủy', 'Nước khe lớn', 'Thủy'], ['Sa Trung Thổ', 'Đất trong cát', 'Thổ'], ['Thiên Thượng Hỏa', 'Lửa trên trời', 'Hỏa'], ['Thạch Lựu Mộc', 'Gỗ cây lựu', 'Mộc'], ['Đại Hải Thủy', 'Nước biển lớn', 'Thủy']];
export const napAm = y => { const i = ((y - 4) % 60 + 60) % 60, n = NAP[i >> 1]; return { ten: n[0], nghia: n[1], hanh: n[2] }; };

export const ZODIAC = [
  { ten: 'Ma Kết', kh: '♑', from: [12, 22], to: [1, 19], nt: 'Đất', ht: 'Sao Thổ', chip: ['Kiên nhẫn', 'Chăm chỉ', 'Đáng tin', 'Ngăn nắp', 'Hài hước ngầm'], ta: 'Bé Ma Kết như một nhà leo núi tí hon: từ tốn, bền bỉ và rất thích tự mình làm cho xong. Bé thương ai là thương lâu, và hay khiến cả nhà bất ngờ vì những câu nói “già dặn” đáng yêu.' },
  { ten: 'Bảo Bình', kh: '♒', from: [1, 20], to: [2, 18], nt: 'Khí', ht: 'Sao Thiên Vương', chip: ['Sáng tạo', 'Tò mò', 'Thân thiện', 'Độc đáo', 'Thích khám phá'], ta: 'Bé Bảo Bình có cả một vũ trụ ý tưởng trong đầu: thích hỏi “tại sao”, thích thử cách làm mới và chơi được với mọi người. Mỗi ngày bên bé đều có một điều lạ vui để kể.' },
  { ten: 'Song Ngư', kh: '♓', from: [2, 19], to: [3, 20], nt: 'Nước', ht: 'Sao Hải Vương', chip: ['Mơ mộng', 'Tình cảm', 'Tinh tế', 'Yêu nghệ thuật', 'Hay thương người'], ta: 'Bé Song Ngư mềm mại như một chú cá nhỏ: giàu tưởng tượng, mê truyện kể, âm nhạc và rất dễ xúc động trước điều đẹp. Một cái ôm của bé đủ làm cả nhà tan chảy.' },
  { ten: 'Bạch Dương', kh: '♈', from: [3, 21], to: [4, 19], nt: 'Lửa', ht: 'Sao Hỏa', chip: ['Năng động', 'Dũng cảm', 'Nhiệt tình', 'Thẳng thắn', 'Thích đi đầu'], ta: 'Bé Bạch Dương là cục pin năng lượng của cả nhà: muốn thử mọi thứ trước tiên, chạy nhảy không ngừng và cười rất to. Bé dạy cả nhà cách sống hết mình mỗi ngày.' },
  { ten: 'Kim Ngưu', kh: '♉', from: [4, 20], to: [5, 20], nt: 'Đất', ht: 'Sao Kim', chip: ['Hiền hoà', 'Kiên định', 'Mê ăn ngon', 'Thích êm ái', 'Chung thuỷ'], ta: 'Bé Kim Ngưu thích những điều dễ chịu: chiếc chăn mềm, bữa ăn ngon và vòng tay quen thuộc. Bé bình tĩnh, đáng tin và có nụ cười làm người khác thấy an lòng.' },
  { ten: 'Song Tử', kh: '♊', from: [5, 21], to: [6, 20], nt: 'Khí', ht: 'Sao Thủy', chip: ['Lanh lợi', 'Nói nhiều', 'Hiếu kỳ', 'Vui tính', 'Học nhanh'], ta: 'Bé Song Tử lanh như một chú sóc: học nói nhanh, bắt chước giỏi và luôn có chuyện để “tám”. Bé biến mọi buổi chiều bình thường thành một bữa tiệc tiếng cười.' },
  { ten: 'Cự Giải', kh: '♋', from: [6, 21], to: [7, 22], nt: 'Nước', ht: 'Mặt Trăng', chip: ['Ấm áp', 'Quấn mẹ', 'Biết quan tâm', 'Nhạy cảm', 'Yêu gia đình'], ta: 'Bé Cự Giải là “người giữ lửa” nhỏ của gia đình: thích được ôm ấp, nhớ từng thói quen của cả nhà và rất biết chăm sóc người khác. Ngôi nhà là nơi bé thấy hạnh phúc nhất.' },
  { ten: 'Sư Tử', kh: '♌', from: [7, 23], to: [8, 22], nt: 'Lửa', ht: 'Mặt Trời', chip: ['Tự tin', 'Rạng rỡ', 'Hào phóng', 'Thích biểu diễn', 'Tốt bụng'], ta: 'Bé Sư Tử toả sáng như mặt trời nhỏ: thích được khen, mê làm “ngôi sao” trong mọi trò chơi và rất hào phóng với bạn bè. Nụ cười của bé có sức kéo cả nhà lại gần nhau.' },
  { ten: 'Xử Nữ', kh: '♍', from: [8, 23], to: [9, 22], nt: 'Đất', ht: 'Sao Thủy', chip: ['Chu đáo', 'Tỉ mỉ', 'Thông minh', 'Gọn gàng', 'Hay giúp đỡ'], ta: 'Bé Xử Nữ để ý từng chi tiết nhỏ: xếp đồ chơi thẳng hàng, nhớ chỗ cất từng món và thích được giúp bố mẹ. Bé chín chắn, dễ thương theo kiểu rất riêng.' },
  { ten: 'Thiên Bình', kh: '♎', from: [9, 23], to: [10, 22], nt: 'Khí', ht: 'Sao Kim', chip: ['Dịu dàng', 'Hoà đồng', 'Yêu cái đẹp', 'Công bằng', 'Duyên dáng'], ta: 'Bé Thiên Bình nhẹ nhàng và duyên dáng: thích màu sắc, âm nhạc, thích chơi chung và luôn muốn mọi người vui vẻ. Bé là “sứ giả hoà bình” tí hon của cả nhà.' },
  { ten: 'Bọ Cạp', kh: '♏', from: [10, 23], to: [11, 21], nt: 'Nước', ht: 'Sao Diêm Vương', chip: ['Mạnh mẽ', 'Sâu sắc', 'Quyết tâm', 'Tình cảm', 'Tinh ý'], ta: 'Bé Bọ Cạp có đôi mắt biết quan sát và một trái tim rất sâu sắc: đã thích gì là quyết tâm đến cùng, đã thương ai là thương hết lòng. Bé mạnh mẽ mà vô cùng tình cảm.' },
  { ten: 'Nhân Mã', kh: '♐', from: [11, 22], to: [12, 21], nt: 'Lửa', ht: 'Sao Mộc', chip: ['Lạc quan', 'Phiêu lưu', 'Hài hước', 'Tự do', 'Ham học hỏi'], ta: 'Bé Nhân Mã là nhà thám hiểm nhỏ: mê đi chơi, mê điều mới và lúc nào cũng tươi cười. Bé mang đến cho cả nhà thật nhiều chuyến phiêu lưu và tiếng cười giòn tan.' }
];
export function zodiacOf(month, day) {
  for (const z of ZODIAC) {
    const [fm, fd] = z.from, [tm, td] = z.to;
    if (fm <= tm ? ((month > fm || (month === fm && day >= fd)) && (month < tm || (month === tm && day <= td))) : ((month === fm && day >= fd) || (month === tm && day <= td) || month > fm || month < tm)) return z;
  }
  return ZODIAC[0];
}
export const DA = ['Ngọc hồng lựu (Garnet)', 'Thạch anh tím (Amethyst)', 'Ngọc xanh biển (Aquamarine)', 'Kim cương (Diamond)', 'Ngọc lục bảo (Emerald)', 'Ngọc trai (Pearl)', 'Hồng ngọc (Ruby)', 'Ngọc olivin (Peridot)', 'Lam ngọc (Sapphire)', 'Đá opal (Opal)', 'Hoàng ngọc (Topaz)', 'Ngọc lam (Turquoise)'];
export const HOA = ['Cẩm chướng', 'Hoa violet', 'Thủy tiên vàng', 'Cúc họa mi', 'Linh lan', 'Hoa hồng', 'Hoa sen', 'Lay ơn', 'Cúc tây', 'Cúc vạn thọ', 'Hoa cúc', 'Thủy tiên trắng'];
export const DAMAU = ['#9b1b30', '#9966cc', '#7fffd4', '#e8f4ff', '#2ecc71', '#f5efe6', '#e0115f', '#9acd32', '#0f52ba', '#f5d0e0', '#ffc87c', '#40e0d0'];
// tính cách theo con giáp (giọng tích cực, viết cho em bé)
export const GIAP = {
  'Tý': 'Bé tuổi Tý lanh lợi, nhanh nhẹn và rất khéo xoay xở. Bé hay để ý mọi thứ xung quanh, học điều mới rất nhanh và luôn biết cách làm cả nhà bật cười.',
  'Sửu': 'Bé tuổi Sửu hiền lành, chăm chỉ và bền bỉ. Bé làm gì cũng từ tốn đến nơi đến chốn, và là chỗ dựa nhỏ đáng tin cho anh chị em.',
  'Dần': 'Bé tuổi Dần mạnh mẽ, dũng cảm và đầy năng lượng. Bé thích khám phá, không ngại thử thách và có một trái tim rất ấm.',
  'Mão': 'Bé tuổi Mão (Mèo) dịu dàng, tinh tế và đáng yêu. Bé thích sự êm ái, biết lắng nghe và luôn mang lại cảm giác bình yên.',
  'Thìn': 'Bé tuổi Thìn tự tin, sáng tạo và nhiều ước mơ. Bé có nguồn năng lượng rực rỡ như chú rồng nhỏ, đi tới đâu là vui tới đó.',
  'Tỵ': 'Bé tuổi Tỵ thông minh, điềm tĩnh và tinh ý. Bé quan sát rất kỹ, nhớ lâu và có nét duyên ngầm khiến ai cũng quý.',
  'Ngọ': 'Bé tuổi Ngọ hoạt bát, vui vẻ và yêu tự do. Bé thích chạy nhảy, kết bạn nhanh và lan toả niềm vui cho mọi người.',
  'Mùi': 'Bé tuổi Mùi hiền hoà, giàu tình cảm và có năng khiếu nghệ thuật. Bé biết quan tâm, thích những điều đẹp đẽ và rất thương gia đình.',
  'Thân': 'Bé tuổi Thân lém lỉnh, thông minh và tò mò. Bé học giỏi bắt chước, nghĩ ra trò chơi mới liên tục và là “cây hài” của cả nhà.',
  'Dậu': 'Bé tuổi Dậu chăm chỉ, gọn gàng và tự tin. Bé thích làm mọi việc chỉn chu, nói năng rành mạch và rất có trách nhiệm.',
  'Tuất': 'Bé tuổi Tuất trung thành, tốt bụng và đáng tin. Bé luôn đứng về phía người mình thương và có trái tim ấm áp, chân thành.',
  'Hợi': 'Bé tuổi Hợi hiền lành, vô tư và hào phóng. Bé dễ thương theo kiểu tròn trịa, vui vẻ, và mang lại nhiều may mắn, tiếng cười cho cả nhà.'
};
export const MENH_TA = { Kim: 'vững vàng, ngăn nắp, có chính kiến', Mộc: 'hiền hoà, giàu sức sống, thích vươn lên', Thủy: 'mềm mại, linh hoạt, tinh tế', Hỏa: 'nhiệt tình, ấm áp, tràn năng lượng', Thổ: 'điềm đạm, bao dung, đáng tin cậy' };
export const LUNAR_MONTH = m => ['Giêng', 'Hai', 'Ba', 'Tư', 'Năm', 'Sáu', 'Bảy', 'Tám', 'Chín', 'Mười', 'Mười Một', 'Chạp'][m - 1];
// gói tất cả thông tin hồ sơ cho một ngày sinh 'YYYY-MM-DD'
export function profileOf(birth) {
  const [y, m, d] = birth.split('-').map(Number), L = solar2lunar(d, m, y), cc = canChi(L.y), chi = CHI[(L.y + 8) % 12];
  return { y, m, d, wd: new Date(y, m - 1, d).getDay(), lunar: L, canChi: cc, chi, con: CON[(L.y + 8) % 12], nap: napAm(L.y), zodiac: zodiacOf(m, d), da: DA[m - 1], daMau: DAMAU[m - 1], hoa: HOA[m - 1], giap: GIAP[chi] };
}
