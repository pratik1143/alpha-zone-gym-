import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/member_model.dart';

class AuthService extends ChangeNotifier {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  MemberModel? _currentMember;
  bool _isLoading = false;
  String? _error;
  StreamSubscription<DocumentSnapshot>? _memberSubscription;

  MemberModel? get currentMember => _currentMember;
  bool get isLoading => _isLoading;
  String? get error => _error;

  AuthService() {
    _auth.authStateChanges().listen(_onAuthStateChanged);
  }

  Future<void> _onAuthStateChanged(User? user) async {
    if (user == null) {
      _memberSubscription?.cancel();
      _memberSubscription = null;
      _currentMember = null;
    } else {
      await _loadMemberProfile(user.uid, user.email ?? '');
    }
    notifyListeners();
  }

  Future<void> _loadMemberProfile(String uid, String email) async {
    try {
      _memberSubscription?.cancel();
      
      String? role;
      
      // Get role details from users collection first
      var userDoc = await _db.collection('users').doc(uid).get();
      if (!userDoc.exists) {
        final query = await _db
            .collection('users')
            .where('email', isEqualTo: email)
            .limit(1)
            .get();
        if (query.docs.isNotEmpty) {
          userDoc = query.docs.first;
        }
      }
      if (userDoc.exists) {
        role = userDoc.data()?['role'];
      }

      // Check if member document exists, then subscribe to updates
      _memberSubscription = _db.collection('members').doc(uid).snapshots().listen((doc) async {
        if (doc.exists) {
          final fetchedMember = MemberModel.fromFirestore(doc);
          
          // Check for force logout
          if (fetchedMember.forceLogout == true) {
            // Reset the flag in Firestore to prevent infinite loop
            await _db.collection('members').doc(uid).update({'forceLogout': false}).catchError((_) {});
            logout();
            return;
          }

          // Check if app access is disabled
          if (fetchedMember.appAccessEnabled == false) {
            logout();
            return;
          }

          _currentMember = fetchedMember;
          notifyListeners();
        } else {
          // Check members collection query fallback (in case doc ID is different from UID)
          final query = await _db
              .collection('members')
              .where('email', isEqualTo: email)
              .limit(1)
              .get();
          if (query.docs.isNotEmpty) {
            final fallbackDoc = query.docs.first;
            // Subscribe to that fallback document instead
            _memberSubscription?.cancel();
            _memberSubscription = fallbackDoc.reference.snapshots().listen((fDoc) async {
              if (fDoc.exists) {
                final fMember = MemberModel.fromFirestore(fDoc);
                if (fMember.forceLogout == true) {
                  await fDoc.reference.update({'forceLogout': false}).catchError((_) {});
                  logout();
                  return;
                }
                if (fMember.appAccessEnabled == false) {
                  logout();
                  return;
                }
                _currentMember = fMember;
                notifyListeners();
              }
            });
            return;
          }

          // Fallback to staff / defaults if no member document exists
          final data = userDoc.exists ? userDoc.data() : null;
          _currentMember = MemberModel(
            id: uid,
            name: data?['name'] ?? email.split('@')[0],
            email: email,
            phone: data?['phone'] ?? '',
            plan: 'Gold Member (Staff)',
            branch: data?['branch'] ?? 'Mohali, Punjab',
            status: 'active',
            joinDate: DateTime.now(),
            expiryDate: DateTime.now().add(const Duration(days: 365)),
            role: role ?? data?['role'] ?? 'member',
            appAccessEnabled: true,
          );
          notifyListeners();
        }
      }, onError: (err) {
        _error = err.toString();
        notifyListeners();
      });
    } catch (e) {
      _error = e.toString();
      notifyListeners();
    }
  }

  Future<String?> login(String usernameOrEmail, String password) async {
    _isLoading = true;
    _error = null;
    notifyListeners();
    try {
      String email = usernameOrEmail.trim();

      // If username does not look like an email, treat as Member ID
      if (!email.contains('@')) {
        final query = await _db
            .collection('members')
            .where('memberId', isEqualTo: email)
            .limit(1)
            .get();
        
        if (query.docs.isEmpty) {
          _isLoading = false;
          _error = 'No member found with this Member ID.';
          notifyListeners();
          return _error;
        }
        
        final resolvedEmail = query.docs.first.data()['email'] as String?;
        if (resolvedEmail == null || resolvedEmail.isEmpty) {
          _isLoading = false;
          _error = 'Member account does not have a registered email.';
          notifyListeners();
          return _error;
        }
        email = resolvedEmail;
      }

      final credential = await _auth.signInWithEmailAndPassword(email: email, password: password);
      final uid = credential.user?.uid;

      if (uid != null) {
        // Double check appAccessEnabled before fully letting them in
        final doc = await _db.collection('members').doc(uid).get();
        if (doc.exists) {
          final fetched = MemberModel.fromFirestore(doc);
          if (fetched.appAccessEnabled == false) {
            await _auth.signOut();
            _isLoading = false;
            _error = 'App access is disabled for this account.';
            notifyListeners();
            return _error;
          }
        }

        // Update lastLogin
        await _db.collection('members').doc(uid).update({
          'lastLogin': FieldValue.serverTimestamp(),
        }).catchError((_) {});
      }

      _isLoading = false;
      notifyListeners();
      return null; // success
    } on FirebaseAuthException catch (e) {
      _isLoading = false;
      _error = switch (e.code) {
        'user-not-found'  => 'No member found with this email.',
        'wrong-password'  => 'Invalid email or password.',
        'invalid-email'   => 'Please enter a valid email address.',
        'user-disabled'   => 'This account has been disabled.',
        _                 => 'Invalid Email or Password.',
      };
      notifyListeners();
      return _error;
    } catch (e) {
      _isLoading = false;
      _error = e.toString();
      notifyListeners();
      return _error;
    }
  }

  Future<void> logout() async {
    _memberSubscription?.cancel();
    _memberSubscription = null;
    await _auth.signOut();
    _currentMember = null;
    notifyListeners();
  }

  @override
  void dispose() {
    _memberSubscription?.cancel();
    super.dispose();
  }
}
