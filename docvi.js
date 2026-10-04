// Hành Trình Của Bạn — "Đọc vị bản thân" cho người lớn: cung hoàng đạo, con giáp + mệnh, thần số học, liên hệ nghề, hợp nhau.
// Giọng ấm áp, tích cực, KHÔNG nói vận hạn / xui xẻo / đoán tương lai. Mang tính tham khảo cho vui.

export const SIGN = {
  'Bạch Dương': { tc: 'Bạn là người khởi đầu: thấy việc là muốn bắt tay vào ngay, nói thẳng nghĩ thật và kéo người khác cùng hăng hái theo.', manh: ['Dám nghĩ dám làm', 'Nhiệt huyết', 'Phản ứng nhanh', 'Thẳng thắn'], luu: 'Đôi khi nhanh quá mà quên nghỉ — thêm một nhịp chậm lại để những dự định đẹp của bạn đi được đường dài.', viec: 'Hợp với việc cần mở đường, ra quyết định nhanh và có mục tiêu rõ; bạn làm tốt nhất khi được tự chủ.', tinh: 'Trong gia đình bạn là người giữ lửa, chủ động tổ chức, che chở người thân bằng hành động cụ thể.' },
  'Kim Ngưu': { tc: 'Bạn điềm đạm, kiên định và biết tận hưởng — một bữa ăn ngon, một góc nhà ấm cũng đủ làm bạn vui cả ngày.', manh: ['Bền bỉ', 'Đáng tin', 'Có gu thẩm mỹ', 'Biết vun vén'], luu: 'Khi đã quen một cách làm, bạn hơi ngại đổi — thử một điều mới nhỏ mỗi tháng sẽ mở ra nhiều niềm vui.', viec: 'Hợp với việc cần sự chắc chắn, tỉ mỉ, gắn với cái đẹp hay tài chính; bạn làm chậm mà chắc, ít khi bỏ dở.', tinh: 'Bạn thương bằng sự có mặt: luôn ở đó, lo chuyện ăn ở, giữ cho tổ ấm êm ả và đủ đầy.' },
  'Song Tử': { tc: 'Bạn lanh lợi, tò mò và nói chuyện có duyên — ở đâu có bạn, ở đó có câu chuyện mới và tiếng cười.', manh: ['Học nhanh', 'Giao tiếp giỏi', 'Linh hoạt', 'Hài hước'], luu: 'Nhiều ý tưởng cùng lúc dễ làm bạn phân tán — chọn một việc làm tới nơi rồi hãy chạy sang việc tiếp theo.', viec: 'Hợp với việc nhiều tương tác: truyền thông, bán hàng, giảng dạy, viết lách, công việc đổi mới liên tục.', tinh: 'Bạn là người bạn đồng hành vui nhộn, luôn có trò mới cho cả nhà và rất biết lắng nghe con trẻ.' },
  'Cự Giải': { tc: 'Bạn giàu tình cảm, tinh ý và chu đáo — người khác chưa nói, bạn đã đoán ra họ cần gì.', manh: ['Biết quan tâm', 'Trí nhớ tốt', 'Kiên nhẫn', 'Yêu gia đình'], luu: 'Bạn hay để bụng và lo cho mọi người hơn lo cho mình — nhớ dành phần dịu dàng ấy cho chính bạn nữa.', viec: 'Hợp với việc chăm sóc, giáo dục, dịch vụ, ẩm thực, quản lý con người — nơi sự tận tâm của bạn được trân trọng.', tinh: 'Gia đình là trung tâm của bạn; bạn là người giữ kỷ niệm, nhớ ngày giỗ, ngày sinh và nấu món ai cũng thương.' },
  'Sư Tử': { tc: 'Bạn rạng rỡ, hào phóng và có sức hút tự nhiên — bạn thích làm mọi thứ thật chỉn chu và đáng tự hào.', manh: ['Tự tin', 'Lãnh đạo tốt', 'Rộng lượng', 'Truyền cảm hứng'], luu: 'Bạn rất cần được ghi nhận — hãy nói ra mong muốn của mình thay vì chờ người khác đoán.', viec: 'Hợp với vai trò dẫn dắt, sân khấu, sáng tạo, kinh doanh — nơi bạn được đứng ra và chịu trách nhiệm.', tinh: 'Bạn bảo vệ người thân hết mình, thích làm những bất ngờ lớn và luôn muốn cả nhà được nở mày nở mặt.' },
  'Xử Nữ': { tc: 'Bạn tỉ mỉ, thông minh và sống có nguyên tắc — chi tiết nhỏ người khác bỏ qua, bạn đều nhìn thấy.', manh: ['Chu đáo', 'Ngăn nắp', 'Phân tích giỏi', 'Tận tuỵ'], luu: 'Tiêu chuẩn cao dễ khiến bạn tự trách mình — "đủ tốt" đôi khi đã là rất tốt rồi.', viec: 'Hợp với việc cần độ chính xác: kỹ thuật, y tế, kế toán, biên tập, nghiên cứu, quản lý quy trình.', tinh: 'Bạn thương bằng việc làm: sắp xếp nhà cửa, lo từng bữa ăn, nhớ từng lịch tiêm của con.' },
  'Thiên Bình': { tc: 'Bạn duyên dáng, công bằng và yêu cái đẹp — bạn khéo hoà giải và làm không khí quanh mình dễ chịu.', manh: ['Hoà nhã', 'Có gu', 'Khéo léo', 'Biết lắng nghe'], luu: 'Muốn ai cũng vui nên đôi khi bạn khó chọn — tin vào cảm nhận đầu tiên của mình thường là đúng.', viec: 'Hợp với nghề sáng tạo, thiết kế, luật, ngoại giao, chăm sóc khách hàng — nơi cần cái đẹp và sự cân bằng.', tinh: 'Bạn vun đắp gia đình bằng sự nhẹ nhàng, ít khi nặng lời, luôn tìm cách cho mọi người cùng thoải mái.' },
  'Bọ Cạp': { tc: 'Bạn sâu sắc, bản lĩnh và rất có chiều sâu — một khi đã gắn bó, bạn gắn bó thật lòng và lâu dài.', manh: ['Kiên định', 'Tinh ý', 'Bản lĩnh', 'Trung thành'], luu: 'Bạn giữ nhiều điều trong lòng — chia sẻ bớt với người thân sẽ thấy nhẹ nhõm hơn nhiều.', viec: 'Hợp với việc cần đào sâu: nghiên cứu, tâm lý, tài chính, điều tra, y khoa — nơi sự tập trung của bạn toả sáng.', tinh: 'Bạn yêu thương mãnh liệt và che chở người nhà như một bức tường vững chãi.' },
  'Nhân Mã': { tc: 'Bạn lạc quan, cởi mở và mê khám phá — mỗi chuyến đi, mỗi cuốn sách đều là một cuộc phiêu lưu.', manh: ['Vui vẻ', 'Thẳng thắn', 'Ham học hỏi', 'Phóng khoáng'], luu: 'Bạn thích tự do nên dễ hứa nhiều — chọn ít lời hứa hơn và giữ trọn vẹn sẽ được tin yêu hơn.', viec: 'Hợp với giáo dục, du lịch, ngoại ngữ, truyền thông, khởi nghiệp — công việc có không gian để lớn lên.', tinh: 'Bạn mang đến cho gia đình những chuyến đi, những trải nghiệm mới và tiếng cười không dứt.' },
  'Ma Kết': { tc: 'Bạn chín chắn, có trách nhiệm và kiên trì — mục tiêu đã đặt ra, bạn đi từng bước cho tới khi đạt được.', manh: ['Kỷ luật', 'Đáng tin', 'Thực tế', 'Bền bỉ'], luu: 'Bạn hay gánh hết việc về mình — cho phép bản thân nghỉ ngơi cũng là một phần của thành công.', viec: 'Hợp với quản lý, kỹ thuật, tài chính, hành chính, xây dựng — nơi cần sự vững vàng và tầm nhìn dài.', tinh: 'Bạn là trụ cột: lo cho tương lai của cả nhà, tình cảm sâu nhưng thể hiện bằng việc làm hơn lời nói.' },
  'Bảo Bình': { tc: 'Bạn độc đáo, giàu ý tưởng và sống vì điều mình tin — bạn thích nghĩ khác và giúp ích cho cộng đồng.', manh: ['Sáng tạo', 'Tư duy mới', 'Thân thiện', 'Tôn trọng người khác'], luu: 'Đôi khi bạn sống trong thế giới ý tưởng — thêm chút hơi ấm trong lời nói, người thân sẽ hiểu bạn hơn.', viec: 'Hợp với công nghệ, khoa học, thiết kế, hoạt động xã hội — nơi được thử nghiệm điều mới.', tinh: 'Bạn là người bạn đời và cha mẹ tôn trọng cá tính, khuyến khích mọi người là chính mình.' },
  'Song Ngư': { tc: 'Bạn mơ mộng, nhân hậu và giàu trí tưởng tượng — bạn cảm được nỗi buồn niềm vui của người khác rất nhanh.', manh: ['Tinh tế', 'Thấu cảm', 'Có hồn nghệ sĩ', 'Bao dung'], luu: 'Bạn dễ nhận phần thiệt về mình — biết nói "không" đúng lúc là cách giữ trái tim đẹp ấy.', viec: 'Hợp với nghệ thuật, âm nhạc, chăm sóc sức khoẻ, tư vấn, giáo dục — nơi lòng trắc ẩn là sức mạnh.', tinh: 'Bạn yêu dịu dàng, lãng mạn và luôn là người an ủi, vỗ về khi cả nhà mỏi mệt.' }
};
export const ELEMENT_TXT = { 'Lửa': 'nhiệt huyết, hành động', 'Đất': 'vững vàng, thực tế', 'Khí': 'ý tưởng, kết nối', 'Nước': 'cảm xúc, thấu hiểu' };

export const GIAP_L = {
  'Tý': { tc: 'Nhanh nhạy, khéo xoay xở và rất biết tích luỹ. Bạn nhìn ra cơ hội sớm và luôn có phương án dự phòng.', so: [2, 3] },
  'Sửu': { tc: 'Chăm chỉ, nhẫn nại và giữ chữ tín. Bạn làm việc lặng lẽ nhưng kết quả luôn chắc chắn.', so: [1, 4] },
  'Dần': { tc: 'Dũng cảm, tự tin và giàu nghĩa khí. Bạn dám đứng ra bảo vệ lẽ phải và người mình thương.', so: [1, 3, 4] },
  'Mão': { tc: 'Hiền hoà, tinh tế và khéo cư xử. Bạn mang lại cảm giác bình yên, ai cũng muốn ở gần.', so: [3, 4, 6] },
  'Thìn': { tc: 'Tràn năng lượng, nhiều hoài bão và có khí chất lãnh đạo. Bạn làm gì cũng muốn làm lớn, làm đẹp.', so: [1, 6, 7] },
  'Tỵ': { tc: 'Điềm tĩnh, sâu sắc và nhạy bén. Bạn suy nghĩ kỹ trước khi nói và hiếm khi quyết định vội.', so: [2, 8, 9] },
  'Ngọ': { tc: 'Hoạt bát, phóng khoáng và yêu tự do. Bạn đi nhiều, quen rộng và lan toả niềm vui.', so: [2, 3, 7] },
  'Mùi': { tc: 'Ôn hoà, giàu tình cảm và có năng khiếu nghệ thuật. Bạn sống tử tế và rất thương gia đình.', so: [3, 4, 9] },
  'Thân': { tc: 'Thông minh, linh hoạt và hài hước. Bạn học gì cũng nhanh, gặp khó là nghĩ ra cách.', so: [1, 7, 8] },
  'Dậu': { tc: 'Chăm chỉ, chỉn chu và thẳng thắn. Bạn có trách nhiệm, làm việc gì cũng rõ ràng, gọn gàng.', so: [5, 7, 8] },
  'Tuất': { tc: 'Trung thực, tận tuỵ và rất nghĩa tình. Bạn là người bạn có thể gửi gắm cả những điều quan trọng.', so: [3, 4, 9] },
  'Hợi': { tc: 'Hiền lành, hào phóng và chân thành. Bạn sống vô tư, dễ tha thứ và mang lại may mắn cho người quanh mình.', so: [2, 5, 8] }
};
// mệnh ngũ hành theo nạp âm: màu hợp (bản mệnh + màu tương sinh)
export const MENH_L = {
  'Kim': { tc: 'Người mệnh Kim quyết đoán, ngay thẳng và có chính kiến; nói được làm được.', mau: ['Trắng', 'Xám bạc', 'Vàng', 'Nâu đất'], ma: ['#f4f4f6', '#b8bcc8', '#f2c94c', '#a47551'] },
  'Mộc': { tc: 'Người mệnh Mộc hiền hoà, giàu lòng nhân và luôn muốn vươn lên, phát triển.', mau: ['Xanh lá', 'Xanh dương', 'Đen'], ma: ['#5cc27a', '#4a8fe7', '#2b2b36'] },
  'Thủy': { tc: 'Người mệnh Thủy mềm mỏng, linh hoạt, giao tiếp khéo và thích nghi rất nhanh.', mau: ['Xanh dương', 'Đen', 'Trắng', 'Bạc'], ma: ['#4a8fe7', '#2b2b36', '#f4f4f6', '#c7ccd6'] },
  'Hỏa': { tc: 'Người mệnh Hỏa nhiệt tình, ấm áp, nhiều năng lượng và truyền cảm hứng cho người khác.', mau: ['Đỏ', 'Cam', 'Hồng', 'Tím', 'Xanh lá'], ma: ['#ef4b4b', '#ff9a3c', '#ff7eb3', '#a06cd5', '#5cc27a'] },
  'Thổ': { tc: 'Người mệnh Thổ điềm đạm, bao dung, sống tình cảm và là chỗ dựa vững vàng.', mau: ['Vàng', 'Nâu', 'Cam', 'Đỏ'], ma: ['#f2c94c', '#a47551', '#ff9a3c', '#ef4b4b'] }
};

// thần số học: cộng mọi chữ số của ngày sinh dương lịch, giữ 11 / 22 / 33
export function lifePath(birth) {
  const ds = String(birth || '').replace(/\D/g, ''); if (ds.length !== 8) return null;
  let n = [...ds].reduce((a, c) => a + +c, 0);
  while (n > 9 && n !== 11 && n !== 22 && n !== 33) n = [...String(n)].reduce((a, c) => a + +c, 0);
  return n;
}
export const NUM = {
  1: { t: 'Người tiên phong', tc: 'Độc lập, chủ động, thích tự mở đường. Bạn có ý chí mạnh và truyền động lực cho người xung quanh.', goi: 'Hãy tin vào ý tưởng của mình và học cách nhờ người khác giúp một tay.' },
  2: { t: 'Người kết nối', tc: 'Tinh tế, hoà nhã, giỏi lắng nghe và gắn kết mọi người. Bạn là chất keo của tập thể.', goi: 'Sự nhạy cảm của bạn là món quà — nhớ chăm sóc cảm xúc của chính mình.' },
  3: { t: 'Người sáng tạo', tc: 'Vui vẻ, giàu ý tưởng, ăn nói có duyên. Bạn mang màu sắc và tiếng cười tới mọi nơi.', goi: 'Viết, vẽ, kể chuyện… những gì bạn tạo ra sẽ làm nhiều người vui.' },
  4: { t: 'Người xây nền', tc: 'Chăm chỉ, thực tế, có kế hoạch. Bạn xây mọi thứ từ móng, chắc chắn và bền lâu.', goi: 'Thỉnh thoảng cho phép bản thân phá lệ một chút để thêm niềm vui.' },
  5: { t: 'Người tự do', tc: 'Năng động, thích trải nghiệm, thích nghi giỏi. Bạn học từ chính những chuyến đi và thử thách.', goi: 'Chọn một vài cam kết quan trọng để tự do của bạn có điểm tựa.' },
  6: { t: 'Người chăm sóc', tc: 'Yêu thương, trách nhiệm, đặt gia đình lên hàng đầu. Bạn là mái nhà ấm cho người thân.', goi: 'Thương người rồi, nhớ thương cả bản thân mình nữa.' },
  7: { t: 'Người suy ngẫm', tc: 'Sâu sắc, ham tìm hiểu, có trực giác tốt. Bạn thích hiểu tận gốc mọi chuyện.', goi: 'Những khoảng lặng một mình giúp bạn nạp lại năng lượng rất nhanh.' },
  8: { t: 'Người thành tựu', tc: 'Bản lĩnh, có tầm nhìn, giỏi tổ chức và quản lý. Bạn biến mục tiêu thành kết quả.', goi: 'Thành công đẹp nhất là khi có người thân cùng chia vui.' },
  9: { t: 'Người nhân ái', tc: 'Bao dung, lý tưởng, sẵn lòng giúp đỡ. Bạn nhìn thấy bức tranh lớn và muốn làm điều tốt.', goi: 'Lòng tốt của bạn lan rất xa — hãy để mọi người đáp lại bạn nữa.' },
  11: { t: 'Số bậc thầy 11 · Người truyền cảm hứng', tc: 'Trực giác mạnh, giàu cảm xúc và lý tưởng. Bạn có khả năng nâng đỡ tinh thần người khác.', goi: 'Tin vào linh cảm của mình — nó thường dẫn bạn đi đúng hướng.' },
  22: { t: 'Số bậc thầy 22 · Người kiến tạo', tc: 'Kết hợp tầm nhìn lớn với sự thực tế. Bạn có thể biến giấc mơ thành công trình cụ thể.', goi: 'Chia việc lớn thành từng bước nhỏ, bạn sẽ đi rất xa.' },
  33: { t: 'Số bậc thầy 33 · Người thầy yêu thương', tc: 'Giàu lòng trắc ẩn, thích chăm sóc và dạy dỗ. Bạn chữa lành bằng sự tử tế.', goi: 'Chăm sóc mình thật tốt để có thể tiếp tục chăm sóc mọi người.' }
};

// liên hệ nghề nghiệp (cho vui, không phán xét): theo nguyên tố cung hoàng đạo
const JOB_KIND = [
  ['sáng tạo', /thiết kế|họa sĩ|nghệ|sáng tạo|nhiếp ảnh|quay phim|viết|nhạc|kiến trúc|marketing|quảng cáo/i],
  ['chăm sóc', /bác sĩ|y tá|điều dưỡng|dược|giáo viên|giảng viên|cô giáo|thầy giáo|nội trợ|tư vấn|tâm lý|mầm non/i],
  ['kỹ thuật', /kỹ sư|lập trình|it|công nghệ|kỹ thuật|xây dựng|cơ khí|điện|phần mềm|khoa học/i],
  ['kinh doanh', /kinh doanh|bán hàng|buôn|chủ|doanh nhân|sale|thương mại|bất động sản/i],
  ['văn phòng', /văn phòng|nhân viên|kế toán|ngân hàng|hành chính|nhân sự|luật/i],
  ['học tập', /học sinh|sinh viên|nghiên cứu sinh/i],
  ['nghỉ ngơi', /nghỉ hưu|hưu/i]
];
const FIT = {
  'Lửa': { 'sáng tạo': 'năng lượng của bạn biến ý tưởng thành sản phẩm rất nhanh', 'kinh doanh': 'bạn sinh ra để mở đường và chốt việc', 'kỹ thuật': 'bạn giải quyết vấn đề nhanh và dứt khoát' },
  'Đất': { 'kỹ thuật': 'sự tỉ mỉ, bền bỉ là lợi thế lớn của bạn', 'văn phòng': 'bạn làm gì cũng chắc chắn, đáng tin', 'kinh doanh': 'bạn giữ chữ tín và vun vén rất giỏi' },
  'Khí': { 'sáng tạo': 'đầu óc nhiều ý tưởng của bạn được dịp bay cao', 'văn phòng': 'bạn kết nối mọi người rất khéo', 'kinh doanh': 'tài giao tiếp của bạn là "vũ khí" lợi hại' },
  'Nước': { 'chăm sóc': 'sự thấu cảm của bạn chạm tới trái tim người khác', 'sáng tạo': 'tâm hồn nghệ sĩ của bạn có đất toả sáng', 'kỹ thuật': 'bạn đào sâu vấn đề tới tận gốc' }
};
export function jobLine(sign, el, job) {
  if (!job) return ''; const k = JOB_KIND.find(([, re]) => re.test(job))?.[0];
  const fit = k && FIT[el]?.[k];
  if (k === 'học tập') return `${sign} đang ${job.toLowerCase()} — tuổi học hành là lúc nét ${ELEMENT_TXT[el]} của bạn lớn lên mỗi ngày.`;
  if (k === 'nghỉ ngơi') return `${sign} đã nghỉ hưu — giờ là lúc dành trọn sự ${ELEMENT_TXT[el].split(',')[0]} cho gia đình, sở thích và những chuyến đi.`;
  if (fit) return `${sign} làm ${job.toLowerCase()} — hợp đó! ${fit[0].toUpperCase() + fit.slice(1)}.`;
  return `${sign} làm ${job.toLowerCase()} — nét ${ELEMENT_TXT[el]} của bạn sẽ mang một màu rất riêng vào công việc này.`;
}

// hợp nhau (tích cực): con giáp tam hợp / lục hợp, nguyên tố cung hoàng đạo
const TAM = [['Thân', 'Tý', 'Thìn'], ['Dần', 'Ngọ', 'Tuất'], ['Tỵ', 'Dậu', 'Sửu'], ['Hợi', 'Mão', 'Mùi']];
const LUC = [['Tý', 'Sửu'], ['Dần', 'Hợi'], ['Mão', 'Tuất'], ['Thìn', 'Dậu'], ['Tỵ', 'Thân'], ['Ngọ', 'Mùi']];
export function giapPair(a, b) {
  if (a === b) return { lv: 2, t: `Cùng tuổi ${a}: hiểu nhau từ trong nếp nghĩ, nhìn là biết người kia đang vui hay đang mệt.` };
  if (TAM.some(g => g.includes(a) && g.includes(b))) return { lv: 3, t: `${a} – ${b} thuộc nhóm tam hợp: cùng chí hướng, làm gì chung cũng thuận, nói chuyện rất "vào".` };
  if (LUC.some(g => g.includes(a) && g.includes(b))) return { lv: 3, t: `${a} – ${b} là cặp lục hợp: bổ sung cho nhau như hai mảnh ghép, người này mạnh đúng chỗ người kia cần.` };
  return { lv: 1, t: `${a} và ${b} mỗi người một nét riêng — chính sự khác biệt giúp cả hai học được nhiều điều từ nhau.` };
}
const EL_PAIR = { 'Lửa-Khí': 'Lửa gặp Khí thì càng cháy sáng: một người khơi ý tưởng, một người biến nó thành hành động.', 'Đất-Nước': 'Đất và Nước nuôi dưỡng nhau: một người vững vàng, một người dịu dàng, cùng nhau vun một mái nhà ấm.' };
export function signPair(za, zb) {
  if (za.ten === zb.ten) return `Cùng là ${za.ten}: đồng điệu cách nghĩ, cách vui, cách thương.`;
  if (za.nt === zb.nt) return `${za.ten} và ${zb.ten} cùng nguyên tố ${za.nt}: chung nhịp ${ELEMENT_TXT[za.nt]}, rất dễ hiểu nhau.`;
  const k = [za.nt, zb.nt].sort().join('-'), k2 = [zb.nt, za.nt].join('-');
  return EL_PAIR[k] || EL_PAIR[k2] || EL_PAIR[[za.nt, zb.nt].join('-')] || `${za.ten} (${za.nt}) và ${zb.ten} (${zb.nt}) bù trừ cho nhau: người này ${ELEMENT_TXT[za.nt].split(',')[0]}, người kia ${ELEMENT_TXT[zb.nt].split(',')[0]} — một sự cân bằng đáng quý.`;
}
