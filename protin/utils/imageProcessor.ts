/**
 * 이미지 배경 제거 유틸리티
 * @imgly/background-removal 라이브러리를 사용하여 이미지 배경을 제거합니다.
 */

/**
 * 이미지 파일에서 배경을 제거하고 Blob을 반환합니다.
 * @param imageFile - 배경을 제거할 이미지 파일
 * @returns 배경이 제거된 이미지 Blob (실패 시 원본 파일을 Blob으로 변환하여 반환)
 */
export const removeBackground = async (imageFile: File): Promise<Blob> => {
  try {
    // 동적 import로 클라이언트 사이드에서만 로드
    const { removeBackground: removeBg } = await import('@imgly/background-removal');
    
    // File 객체를 직접 전달하거나 Blob URL로 변환
    // 라이브러리가 File 객체를 직접 지원하는지 확인
    let blob: Blob;
    
    try {
      // 먼저 File 객체를 직접 시도
      blob = await removeBg(imageFile);
    } catch {
      // File 객체가 안 되면 Blob URL로 시도
      const imageUrl = URL.createObjectURL(imageFile);
      blob = await removeBg(imageUrl);
      URL.revokeObjectURL(imageUrl);
    }
    
    return blob;
  } catch (error) {
    console.error('배경 제거 실패:', error);
    // 실패 시 원본 파일을 Blob으로 변환하여 반환
    return new Blob([imageFile], { type: imageFile.type });
  }
};

/**
 * Blob을 Base64 Data URL로 변환합니다.
 * @param blob - 변환할 Blob
 * @returns Base64 Data URL
 */
export const blobToDataURL = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

