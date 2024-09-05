// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract DigitalNotebook is Pausable, Ownable {
    struct Note {
        string content;
        address creator;
        bool isPublic;
        mapping(address => bool) sharedWith;
    }

    mapping(uint256 => Note) private notes;
    mapping(address => uint256[]) private userNotes;
    mapping(uint256 => bool) private noteExists;
    uint256 private noteCounter;

    error NotCreator(address caller);

    constructor(address initialOwner) Ownable(initialOwner) {}

    event NoteCreated(uint256 noteId, address creator);
    event NoteDeleted(uint256 noteId, address creator);
    event NoteSharingUpdated(
        uint256 noteId,
        bool isPublic,
        address[] sharedWith
    );
    event NoteSharingRemoved(uint256 noteId, address removedFrom);

    modifier noteExist(uint256 _noteId) {
        require(_noteId > 0 && _noteId <= noteCounter, "Note does not exist");
        _;
    }

    modifier noteNotDeleted(uint256 _noteId) {
        require(noteExists[_noteId], "Note has been deleted");
        _;
    }

    fallback() external {
        revert("Fallback function: Call a function that exists!");
    }

    function addNote(string memory _content) public {
        noteCounter++;
        Note storage newNote = notes[noteCounter];
        newNote.content = _content;
        newNote.creator = msg.sender;
        newNote.isPublic = false;
        userNotes[msg.sender].push(noteCounter);
        noteExists[noteCounter] = true;

        assert(keccak256(bytes(_content)) == keccak256(bytes(newNote.content)));
        emit NoteCreated(noteCounter, msg.sender);
    }

    function getUserNoteAmount() public view returns (uint256[] memory) {
        return userNotes[msg.sender];
    }

    function deleteNote(
        uint256 _noteId
    ) public noteExist(_noteId) noteNotDeleted(_noteId) {
        Note storage note = notes[_noteId];
        if(note.creator != msg.sender) revert NotCreator(msg.sender);

        delete notes[_noteId];
        noteExists[_noteId] = false;

        uint256[] storage userNoteList = userNotes[msg.sender];
        for (uint256 i = 0; i < userNoteList.length; i++) {
            if (userNoteList[i] == _noteId) {
                userNoteList[i] = userNoteList[userNoteList.length - 1];
                userNoteList.pop();
                break;
            }
        }

        emit NoteDeleted(_noteId, msg.sender);
    }

    function updateSharingSettings(
        uint256 _noteId,
        bool _isPublic,
        address[] memory _sharedWith
    ) public noteExist(_noteId) noteNotDeleted(_noteId) {
        Note storage note = notes[_noteId];
        require(
            note.creator == msg.sender,
            "Only the creator can update sharing settings"
        );
        note.isPublic = _isPublic;

        for (uint256 i = 0; i < _sharedWith.length; i++) {
            note.sharedWith[_sharedWith[i]] = true;
        }

        emit NoteSharingUpdated(_noteId, _isPublic, _sharedWith);
    }

    function getSharedNote(
        uint256 _noteId
    )
        public
        view
        noteExist(_noteId)
        noteNotDeleted(_noteId)
        returns (string memory)
    {
        Note storage note = notes[_noteId];
        require(
            note.creator == msg.sender ||
                note.isPublic ||
                note.sharedWith[msg.sender],
            "You do not have access to this note"
        );
        return note.content;
    }

    function removeSharedAddress(
        uint256 _noteId,
        address _addressToRemove
    ) public noteExist(_noteId) noteNotDeleted(_noteId) {
        Note storage note = notes[_noteId];
        require(
            note.creator == msg.sender,
            "Only the creator can remove sharing addresses"
        );

        if (!note.sharedWith[_addressToRemove]) {
            revert("Address is not shared with this note");
        }

        note.sharedWith[_addressToRemove] = false;

        emit NoteSharingRemoved(_noteId, _addressToRemove);
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }
}
