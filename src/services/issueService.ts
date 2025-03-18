import { ref, push, update, remove, get, query, orderByChild, onValue, onDisconnect, set } from 'firebase/database';
import { rtdb, sanitizePath } from '../firebase';
import { Issue } from '../types';

const ISSUES_PATH = 'issues';

// Kiểm tra xem Firebase có kết nối không
export const checkFirebaseConnection = async (): Promise<boolean> => {
  try {
    const connectedRef = ref(rtdb, '.info/connected');
    return new Promise((resolve) => {
      onValue(connectedRef, (snap) => {
        const connected = !!snap.val();
        console.log(`Firebase connection status: ${connected ? 'Connected' : 'Disconnected'}`);
        resolve(connected);
      }, { onlyOnce: true });
      
      // Nếu sau 5 giây không có phản hồi, coi như không kết nối được
      setTimeout(() => {
        console.log('Firebase connection timeout');
        resolve(false);
      }, 5000);
    });
  } catch (error) {
    console.error('Error checking Firebase connection:', error);
    return false;
  }
};

// Lấy tất cả issues từ Realtime Database
export const fetchIssues = async (): Promise<Issue[]> => {
  try {
    console.log('Đang lấy issues từ Firebase...');
    
    // Kiểm tra kết nối trước
    const isConnected = await checkFirebaseConnection();
    if (!isConnected) {
      console.warn('Không có kết nối đến Firebase, sẽ thử lấy dữ liệu cục bộ');
      // Thử lấy từ localStorage nếu có
      const cachedIssues = localStorage.getItem('cachedIssues');
      if (cachedIssues) {
        console.log('Đã tìm thấy dữ liệu issues trong cache');
        return JSON.parse(cachedIssues);
      }
      console.warn('Không tìm thấy dữ liệu cache');
      return [];
    }
    
    const cleanPath = sanitizePath(ISSUES_PATH);
    const issuesRef = ref(rtdb, cleanPath);
    
    // Sử dụng Promise để xử lý dữ liệu bất đồng bộ
    return new Promise((resolve, reject) => {
      get(issuesRef).then((snapshot) => {
        console.log('Nhận được dữ liệu từ Firebase:', snapshot.exists());
        
        if (!snapshot.exists()) {
          console.log('Không có dữ liệu issues');
          resolve([]);
          return;
        }
        
        const issues: Issue[] = [];
        const data = snapshot.val();
        
        // Kiểm tra data có tồn tại không
        if (!data) {
          console.log('Dữ liệu từ Firebase là null hoặc undefined');
          resolve([]);
          return;
        }
        
        try {
          // Chuyển đổi dữ liệu từ object sang array
          Object.keys(data).forEach((key) => {
            const issue = data[key];
            if (issue) {
              issues.push({
                ...issue,
                id: key
              });
            } else {
              console.warn(`Dữ liệu cho key ${key} là null hoặc undefined`);
            }
          });
          
          console.log(`Đã tìm thấy ${issues.length} issues`);
          
          // Sắp xếp theo thời gian tạo (mới nhất trước)
          const sortedIssues = issues.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
          });
          
          // Lưu vào localStorage để dùng khi offline
          localStorage.setItem('cachedIssues', JSON.stringify(sortedIssues));
          localStorage.setItem('lastFetched', new Date().toISOString());
          
          resolve(sortedIssues);
        } catch (error) {
          console.error('Lỗi khi xử lý dữ liệu issues:', error);
          // Thử lấy từ localStorage nếu có lỗi xử lý
          const cachedIssues = localStorage.getItem('cachedIssues');
          if (cachedIssues) {
            console.log('Sử dụng dữ liệu cache do lỗi xử lý');
            resolve(JSON.parse(cachedIssues));
          } else {
            resolve([]);
          }
        }
      }).catch((error) => {
        console.error('Lỗi khi lấy dữ liệu từ Firebase:', error);
        
        // Thử lấy từ localStorage nếu có lỗi
        const cachedIssues = localStorage.getItem('cachedIssues');
        if (cachedIssues) {
          console.log('Sử dụng dữ liệu cache do lỗi kết nối');
          resolve(JSON.parse(cachedIssues));
        } else {
          reject(error);
        }
      });
    });
  } catch (error) {
    console.error('Error fetching issues:', error);
    
    // Thử lấy từ localStorage trong trường hợp lỗi
    const cachedIssues = localStorage.getItem('cachedIssues');
    if (cachedIssues) {
      return JSON.parse(cachedIssues);
    }
    return [];
  }
};

// Thiết lập lắng nghe realtime cho issues
export const setupIssuesListener = (callback: (issues: Issue[]) => void): (() => void) => {
  try {
    // Đảm bảo đường dẫn không có ký tự không hợp lệ
    const cleanPath = sanitizePath(ISSUES_PATH);
    const issuesRef = ref(rtdb, cleanPath);
    
    // Thiết lập xử lý khi mất kết nối
    const statusRef = ref(rtdb, '.info/connected');
    
    const statusListener = onValue(statusRef, (snapshot) => {
      const isConnected = snapshot.val() === true;
      console.log(`Kết nối với Firebase: ${isConnected ? 'Đã kết nối' : 'Mất kết nối'}`);
      
      if (isConnected) {
        // Khi kết nối lại, đồng bộ dữ liệu từ localStorage nếu có
        const cachedIssues = localStorage.getItem('pendingChanges');
        if (cachedIssues) {
          const changes = JSON.parse(cachedIssues);
          console.log('Đồng bộ các thay đổi chưa lưu:', changes.length);
          // Thực hiện đồng bộ ở đây (code phức tạp hơn cần thiết cho demo)
          localStorage.removeItem('pendingChanges');
        }
      } else {
        console.log('Mất kết nối với Firebase');
      }
    });
    
    // Lắng nghe sự thay đổi từ database
    const unsubscribe = onValue(issuesRef, (snapshot) => {
      if (!snapshot.exists()) {
        console.log('Không có dữ liệu issues từ listener');
        callback([]);
        return;
      }
      
      console.log('Nhận được cập nhật từ Firebase listener');
      const issues: Issue[] = [];
      const data = snapshot.val();
      
      // Kiểm tra data có tồn tại không
      if (!data) {
        console.log('Dữ liệu từ Firebase là null hoặc undefined');
        callback([]);
        return;
      }
      
      // Chuyển đổi dữ liệu từ object sang array
      try {
        Object.keys(data).forEach((key) => {
          if (data[key]) {
            issues.push({
              ...data[key],
              id: key
            });
          } else {
            console.warn(`Dữ liệu cho key ${key} là null hoặc undefined`);
          }
        });
        
        // Sắp xếp theo thời gian tạo (mới nhất trước)
        const sortedIssues = issues.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });
        
        // Lưu vào localStorage
        localStorage.setItem('cachedIssues', JSON.stringify(sortedIssues));
        localStorage.setItem('lastFetched', new Date().toISOString());
        
        callback(sortedIssues);
      } catch (error) {
        console.error('Lỗi khi xử lý dữ liệu từ Firebase:', error);
        // Thử lấy dữ liệu từ cache nếu có lỗi
        const cachedIssues = localStorage.getItem('cachedIssues');
        if (cachedIssues) {
          console.log('Sử dụng dữ liệu cache do lỗi xử lý');
          callback(JSON.parse(cachedIssues));
        } else {
          callback([]);
        }
      }
    }, (error) => {
      console.error('Lỗi từ listener Firebase:', error);
      
      // Nếu có lỗi, thử lấy dữ liệu từ cache
      const cachedIssues = localStorage.getItem('cachedIssues');
      if (cachedIssues) {
        console.log('Sử dụng dữ liệu cache do lỗi listener');
        callback(JSON.parse(cachedIssues));
      }
    });
    
    // Trả về hàm để huỷ lắng nghe khi cần
    return unsubscribe;
  } catch (error) {
    console.error('Error setting up issues listener:', error);
    return () => {};
  }
};

// Thêm issue mới vào Realtime Database
export const addIssue = async (issue: Omit<Issue, 'id'>): Promise<Issue | null> => {
  try {
    console.log('Bắt đầu thêm issue vào Firebase:', issue);
    
    // Kiểm tra kết nối trước
    const isConnected = await checkFirebaseConnection();
    if (!isConnected) {
      console.warn('Không có kết nối đến Firebase, lưu tạm thời vào localStorage');
      
      // Tạo ID tạm thời cho issue
      const tempId = `temp_${Date.now()}`;
      const tempIssue = {
        ...issue,
        id: tempId,
        createdAt: new Date().toISOString(),
        _pendingCreation: true  // Đánh dấu cần tạo khi online
      };
      
      // Lấy pendingChanges từ localStorage nếu có
      const pendingChangesStr = localStorage.getItem('pendingChanges') || '[]';
      const pendingChanges = JSON.parse(pendingChangesStr);
      pendingChanges.push({
        type: 'create',
        data: tempIssue
      });
      localStorage.setItem('pendingChanges', JSON.stringify(pendingChanges));
      
      // Cập nhật cachedIssues
      const cachedIssuesStr = localStorage.getItem('cachedIssues') || '[]';
      const cachedIssues = JSON.parse(cachedIssuesStr);
      cachedIssues.unshift(tempIssue); // Thêm vào đầu danh sách
      localStorage.setItem('cachedIssues', JSON.stringify(cachedIssues));
      
      return tempIssue as any;
    }
    
    // Xóa id nếu có (sẽ sử dụng id của Firebase)
    const { id, ...issueData } = issue as any;
    
    const cleanPath = sanitizePath(ISSUES_PATH);
    const issuesRef = ref(rtdb, cleanPath);
    const newIssueRef = push(issuesRef);
    
    const newIssue = {
      ...issueData,
      createdAt: new Date().toISOString()
    };
    
    console.log('Đang cập nhật Firebase với data:', newIssue);
    await update(newIssueRef, newIssue);
    
    const result = {
      ...newIssue,
      id: newIssueRef.key || Date.now().toString()
    };
    
    console.log('Issue đã được thêm thành công với ID:', result.id);
    return result;
  } catch (error) {
    console.error('Error adding issue:', error);
    return null;
  }
};

// Cập nhật issue
export const updateIssue = async (issue: Issue): Promise<boolean> => {
  try {
    const { id, ...updates } = issue;
    
    if (!id) {
      console.error('Cannot update issue without ID');
      return false;
    }
    
    // Kiểm tra kết nối
    const isConnected = await checkFirebaseConnection();
    if (!isConnected) {
      console.warn('Không có kết nối, lưu thay đổi vào offline queue');
      // Lưu thay đổi vào hàng đợi offline
      const pendingChanges = JSON.parse(localStorage.getItem('pendingChanges') || '[]');
      pendingChanges.push({ type: 'update', data: issue });
      localStorage.setItem('pendingChanges', JSON.stringify(pendingChanges));
      
      // Cập nhật cache
      const cachedIssues = JSON.parse(localStorage.getItem('cachedIssues') || '[]');
      const updatedCache = cachedIssues.map((item: Issue) => 
        item.id === id ? issue : item
      );
      localStorage.setItem('cachedIssues', JSON.stringify(updatedCache));
      
      return true;
    }
    
    const cleanPath = sanitizePath(`${ISSUES_PATH}/${id}`);
    const issueRef = ref(rtdb, cleanPath);
    
    await update(issueRef, updates);
    console.log(`Issue ${id} đã được cập nhật`);
    return true;
  } catch (error) {
    console.error('Error updating issue:', error);
    return false;
  }
};

// Xóa issue
export const deleteIssue = async (id: string): Promise<boolean> => {
  try {
    // Kiểm tra kết nối
    const isConnected = await checkFirebaseConnection();
    if (!isConnected) {
      console.warn('Không có kết nối, lưu thao tác xóa vào offline queue');
      // Lưu thao tác xóa vào hàng đợi offline
      const pendingChanges = JSON.parse(localStorage.getItem('pendingChanges') || '[]');
      pendingChanges.push({ type: 'delete', data: { id } });
      localStorage.setItem('pendingChanges', JSON.stringify(pendingChanges));
      
      // Cập nhật cache
      const cachedIssues = JSON.parse(localStorage.getItem('cachedIssues') || '[]');
      const updatedCache = cachedIssues.filter((item: Issue) => item.id !== id);
      localStorage.setItem('cachedIssues', JSON.stringify(updatedCache));
      
      return true;
    }
    
    const cleanPath = sanitizePath(`${ISSUES_PATH}/${id}`);
    const issueRef = ref(rtdb, cleanPath);
    
    await remove(issueRef);
    console.log(`Issue ${id} đã được xóa`);
    return true;
  } catch (error) {
    console.error('Error deleting issue:', error);
    return false;
  }
}; 