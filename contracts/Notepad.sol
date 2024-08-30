// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

contract Notepad {
    struct NoteData {
        uint256 id;
        address owner;
        string title;
        string note;
        bool exist;
    }

    struct SharedNoteData {
        uint256 id;
        address owner;
        address sharedTo;
        string title;
        string note;
    }

    uint256 private noteCount;

    mapping(address => mapping(string => NoteData)) userNotes;
    mapping(address => string[]) userNoteByTitles;
    mapping(address => mapping(address => SharedNoteData[])) sharedNotes;
    mapping(address => mapping(address => uint256[])) sharedNotesIndex;

    event noteShared(uint256 _id, address _owner, address _to);

    modifier noteDoesNotExist(address _user, string memory _title) {
        require(
            !userNotes[msg.sender][_title].exist,
            "Note does already exist"
        );
        _;
    }

    modifier noteExists(address _user, string memory _title) {
        require(userNotes[msg.sender][_title].exist, "Note does not exist");
        _;
    }

    function addNote(string memory _title, string memory _note) public noteDoesNotExist(msg.sender, _title) {
        ++noteCount;
        userNotes[msg.sender][_title] = NoteData(noteCount, msg.sender, _title, _note, true);
        userNoteByTitles[msg.sender].push(_title);
    }

    function getUserNoteCount() external view returns (uint256) {
        return userNoteByTitles[msg.sender].length;
    }

    function getUserNotes() external view returns (uint256[] memory _ids, address _owner, string[] memory _titles, string[] memory _notes) {
        uint256 countNotes = userNoteByTitles[msg.sender].length;
        _ids = new uint256[](countNotes);
        _titles = new string[](countNotes);
        _notes = new string[](countNotes);

        for(uint256 i = 0; i < countNotes; ++i) {
            string memory title = userNoteByTitles[msg.sender][i];
            NoteData storage noteData = userNotes[msg.sender][title];
            
            _ids[i] = noteData.id;
            _owner = noteData.owner;
            _titles[i] = noteData.title;
            _notes[i] = noteData.note;
        }

        return (_ids, _owner, _titles, _notes);
    }

    function updateNote(string memory _oldTitle, string memory _newTitle, string memory _updatedNote) external noteExists(msg.sender, _oldTitle) {
        if(keccak256(bytes(_oldTitle)) != keccak256(bytes(_newTitle))) {
            
            userNotes[msg.sender][_newTitle] = NoteData(noteCount, msg.sender, _newTitle, _updatedNote, true);
            delete userNotes[msg.sender][_oldTitle];
            for(uint256 i = 0; i < userNoteByTitles[msg.sender].length; i++) {
                if(keccak256(bytes(userNoteByTitles[msg.sender][i])) == keccak256(bytes(_oldTitle))) {
                    userNoteByTitles[msg.sender][i] = _newTitle;
                    break;
                }
            }
        } else {
            userNotes[msg.sender][_oldTitle].note = _updatedNote;
        }
    }

    function deleteNote(string memory _title) external noteExists(msg.sender, _title) {
        delete userNotes[msg.sender][_title];

        for(uint256 i = 0; i < userNoteByTitles[msg.sender].length; ++i) {
            if(keccak256(bytes(userNoteByTitles[msg.sender][i])) == keccak256(bytes(_title))) {
                userNoteByTitles[msg.sender][i] = userNoteByTitles[msg.sender][userNoteByTitles[msg.sender].length - 1];
                userNoteByTitles[msg.sender].pop();
                break;
            }
        }
    }

    function shareNote(uint256 _id, address _to) external {
        string memory title = userNoteByTitles[msg.sender][_id];
        
        NoteData storage noteData = userNotes[msg.sender][title];
        require(noteData.owner == msg.sender, "You do not own this note");
        
        // Create shared note data
        SharedNoteData memory sharedNote = SharedNoteData({
            id: _id, 
            owner: msg.sender,
            sharedTo: _to, 
            title: noteData.title,
            note: noteData.note
        });

        sharedNotes[_to][msg.sender].push(sharedNote);
        sharedNotesIndex[_to][msg.sender].push(sharedNotes[_to][msg.sender].length);

        emit noteShared(_id, msg.sender, _to);
    }

    
}
