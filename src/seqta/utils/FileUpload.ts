/**
 * Uploads an image file to a specified endpoint using a POST request.
 *
 * @param {File} file - The file to be uploaded.
 * @returns {Promise} A promise that resolves to the response from the server.
 * @throws {Error} If no file is provided or if there is an error during upload.
 */
export async function UploadImage(file: File): Promise<any> {
  // Ensuring that file is provided
  if (!file) {
    throw new Error("No file provided");
  }

  // Extracting the filename
  const fileName = file.name;

  // Assuming 'document.cookie' contains all the cookies in the format you provided
  const cookies = document.cookie;

  // Setting up the request options
  const requestOptions = {
    method: 'POST',
    headers: {
      'Cookie': cookies,
      'X-File-Name': fileName
    },
    body: file // Binary file data
  };

  // Making the fetch request and returning the promise
  return await fetch('/seqta/student/file/upload/xhr2', requestOptions)
    .then(async response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const json = await response.json();
      return `/seqta/student/load/file?type=message&file=${json.uuid}`;
    })
    .catch(error => {
      console.error('Error during file upload:', error);
      throw error;
    });
}
